import json
from datetime import timedelta
from queue import Empty

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view, inline_serializer
from rest_framework import serializers as drf_serializers
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.renderers import BaseRenderer
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .cookies import REFRESH_COOKIE_NAME, delete_refresh_cookie, set_refresh_cookie
from . import pubsub
from .models import Field, FieldUpdate, Notification, trim_notifications_for_recipient
from .permissions import CanViewField, CanViewFieldUpdates, IsAdminUserRole
from .serializers import (
    AdminDashboardSerializer,
    AgentCreateSerializer,
    AgentDashboardSerializer,
    FieldAgentUpdateSerializer,
    FieldMergeSerializer,
    FieldSerializer,
    FieldUpdateSerializer,
    LoginSerializer,
    NotificationSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()

_health_ok = inline_serializer(name="HealthOk", fields={"status": drf_serializers.CharField()})
_login_ok = inline_serializer(
    name="LoginOk",
    fields={
        "access": drf_serializers.CharField(help_text="JWT access token"),
        "user": UserSerializer(),
    },
)
_refresh_ok = inline_serializer(
    name="RefreshOk",
    fields={"access": drf_serializers.CharField(help_text="New JWT access token")},
)


@extend_schema(responses={200: _health_ok}, tags=["meta"])
@api_view(["GET"])
@permission_classes([AllowAny])
def health(_request):
    return Response({"status": "ok"})


@extend_schema(
    tags=["auth"],
    summary="Log in",
    request=LoginSerializer,
    responses={
        200: _login_ok,
        400: OpenApiTypes.OBJECT,
        401: OpenApiTypes.OBJECT,
    },
)
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            # Distinguish "missing/malformed input" (400) from "credentials don't
            # match" (401). DRF puts our credential error under `non_field_errors`;
            # surface it as a standard `{"detail": "..."}` 401 so clients can show
            # a clean "Wrong email or password." message.
            non_field = serializer.errors.get("non_field_errors")
            if non_field:
                return Response(
                    {"detail": "Wrong email or password."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        response = Response(
            {"access": str(refresh.access_token), "user": UserSerializer(user).data},
            status=status.HTTP_200_OK,
        )
        set_refresh_cookie(response, str(refresh))
        return response


@extend_schema(
    tags=["auth"],
    summary="Refresh access token",
    request=None,
    responses={200: _refresh_ok, 401: OpenApiTypes.OBJECT},
    description="Reads refresh JWT from the `mavuno_refresh` httpOnly cookie.",
)
class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_str = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if not refresh_str:
            return Response(
                {"detail": "No refresh token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        serializer = TokenRefreshSerializer(data={"refresh": refresh_str})
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError:
            return Response(
                {"detail": "Invalid refresh token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        data = serializer.validated_data
        response = Response({"access": data["access"]})
        if "refresh" in data:
            set_refresh_cookie(response, data["refresh"])
        return response


@extend_schema(
    tags=["auth"],
    summary="Log out",
    request=None,
    responses={204: None},
    description="Blacklists the refresh token from the cookie and clears the cookie.",
)
class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_str = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if refresh_str:
            try:
                token = RefreshToken(refresh_str)
                token.blacklist()
            except TokenError:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        delete_refresh_cookie(response)
        return response


@extend_schema(
    tags=["auth"],
    summary="Register user",
    request=RegisterSerializer,
    responses={201: UserSerializer, 403: OpenApiTypes.OBJECT},
    description="First user in an empty database becomes admin; later signups require an authenticated admin.",
)
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        any_users_exist = User.objects.exists()
        if any_users_exist and (not request.user.is_authenticated or not request.user.is_admin):
            return Response(
                {"detail": "Only admins can register new users."},
                status=status.HTTP_403_FORBIDDEN,
            )

        payload = request.data.copy()
        if not any_users_exist and "role" not in payload:
            payload["role"] = User.Role.ADMIN
        serializer = RegisterSerializer(data=payload, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["auth"], summary="Current user", responses={200: UserSerializer})
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


@extend_schema_view(
    get=extend_schema(
        summary="List field agents",
        responses={200: UserSerializer(many=True)},
        operation_id="agents_list",
    ),
    post=extend_schema(
        summary="Create field agent",
        request=AgentCreateSerializer,
        responses={201: UserSerializer},
        operation_id="agents_create",
    ),
)
class AgentListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserRole]

    def get(self, request):
        agents = User.objects.filter(role=User.Role.AGENT).order_by("username")
        return Response(UserSerializer(agents, many=True).data)

    def post(self, request):
        serializer = AgentCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    get=extend_schema(
        summary="List fields",
        responses={200: FieldSerializer(many=True)},
        operation_id="field_collection_list",
    ),
    post=extend_schema(
        summary="Create field (admin)",
        request=FieldSerializer,
        responses={201: FieldSerializer, 403: OpenApiTypes.OBJECT},
        operation_id="field_collection_create",
    ),
)
class FieldListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self, user):
        if user.is_admin:
            return Field.objects.all().prefetch_related("assigned_agents")
        return user.assigned_fields.all().prefetch_related("assigned_agents")

    def get(self, request):
        serializer = FieldSerializer(self.get_queryset(request.user), many=True)
        return Response(serializer.data)

    def post(self, request):
        if not request.user.is_admin:
            return Response({"detail": "Admin role required."}, status=status.HTTP_403_FORBIDDEN)
        serializer = FieldSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        field = serializer.save()
        field.refresh_status()
        return Response(FieldSerializer(field).data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    get=extend_schema(
        summary="Retrieve field",
        responses={200: FieldSerializer},
        operation_id="field_item_retrieve",
    ),
    put=extend_schema(
        summary="Update field",
        request=FieldSerializer,
        responses={200: FieldSerializer, 403: OpenApiTypes.OBJECT},
        operation_id="field_item_update",
        description="Admins may send the full `FieldSerializer` body; agents send only stage/notes (enforced server-side).",
    ),
    delete=extend_schema(
        summary="Delete field (admin)",
        responses={204: None, 403: OpenApiTypes.OBJECT},
        operation_id="field_item_destroy",
    ),
)
class FieldDetailView(APIView):
    permission_classes = [IsAuthenticated, CanViewField]

    def get_object(self, pk):
        return get_object_or_404(Field.objects.prefetch_related("assigned_agents"), pk=pk)

    def get(self, request, pk):
        field = self.get_object(pk)
        self.check_object_permissions(request, field)
        return Response(FieldSerializer(field).data)

    def put(self, request, pk):
        field = self.get_object(pk)
        self.check_object_permissions(request, field)

        if request.user.is_admin:
            serializer = FieldSerializer(field, data=request.data, partial=True)
        else:
            serializer = FieldAgentUpdateSerializer(field, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        field = serializer.save()

        if "current_stage" in serializer.validated_data or "notes" in serializer.validated_data:
            FieldUpdate.objects.create(
                field=field,
                stage=serializer.validated_data.get("current_stage", field.current_stage),
                notes=serializer.validated_data.get("notes", field.notes),
                agent=request.user,
            )
            field.refresh_status()

        return Response(FieldSerializer(field).data)

    def delete(self, request, pk):
        if not request.user.is_admin:
            return Response({"detail": "Admin role required."}, status=status.HTTP_403_FORBIDDEN)
        field = get_object_or_404(Field.objects.prefetch_related("assigned_agents"), pk=pk)
        name = field.name
        field_pk = field.pk
        agents = list(field.assigned_agents.all())
        for agent in agents:
            Notification.objects.create(
                recipient=agent,
                kind=Notification.Kind.FIELD_DELETED,
                title=f'Field "{name}" was removed',
                body="You are no longer assigned to this field.",
                related_field_id=field_pk,
            )
            trim_notifications_for_recipient(agent.id)
        field.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    tags=["fields"],
    summary="List updates for a field",
    responses={200: FieldUpdateSerializer(many=True)},
)
class FieldUpdatesView(APIView):
    permission_classes = [IsAuthenticated, CanViewFieldUpdates]

    def get(self, request, pk):
        field = get_object_or_404(Field.objects.prefetch_related("assigned_agents"), pk=pk)
        self.check_object_permissions(request, field)
        updates = field.updates.select_related("agent").all()
        serializer = FieldUpdateSerializer(updates, many=True)
        return Response(serializer.data)


@extend_schema(
    tags=["fields"],
    summary="Recent updates feed",
    responses={200: FieldUpdateSerializer(many=True)},
    parameters=[
        OpenApiParameter(
            name="limit",
            type=int,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Max updates to return (1–100).",
        ),
    ],
)
class UpdatesFeedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", 20))
        except ValueError:
            limit = 20
        limit = max(1, min(limit, 100))
        qs = FieldUpdate.objects.select_related("agent", "field").order_by("-timestamp")
        if not request.user.is_admin:
            qs = qs.filter(agent=request.user)
        serializer = FieldUpdateSerializer(qs[:limit], many=True)
        return Response(serializer.data)


@extend_schema(
    tags=["dashboard"],
    summary="Admin dashboard aggregates",
    responses={200: AdminDashboardSerializer},
)
class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserRole]

    def get(self, request):
        status_counts = Field.objects.values("status").annotate(total=Count("id"))
        status_breakdown = {item["status"]: item["total"] for item in status_counts}
        data = {
            "total_fields": Field.objects.count(),
            "status_breakdown": status_breakdown,
            "total_agents": User.objects.filter(role=User.Role.AGENT).count(),
            "recent_updates": FieldUpdate.objects.filter(
                timestamp__gte=timezone.now() - timedelta(days=7)
            ).count(),
        }
        serializer = AdminDashboardSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)


@extend_schema(
    tags=["dashboard"],
    summary="Agent dashboard aggregates",
    responses={200: AgentDashboardSerializer, 403: OpenApiTypes.OBJECT},
)
class AgentDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_agent and not request.user.is_admin:
            return Response({"detail": "Role not authorized."}, status=status.HTTP_403_FORBIDDEN)

        assigned_fields = request.user.assigned_fields.all()
        status_counts = assigned_fields.values("status").annotate(total=Count("id"))
        status_breakdown = {item["status"]: item["total"] for item in status_counts}
        data = {
            "assigned_fields": assigned_fields.count(),
            "status_breakdown": status_breakdown,
            "my_recent_updates": FieldUpdate.objects.filter(
                agent=request.user, timestamp__gte=timezone.now() - timedelta(days=7)
            ).count(),
        }
        serializer = AgentDashboardSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)


@extend_schema(
    tags=["fields"],
    summary="Merge fields into a new field (admin)",
    request=FieldMergeSerializer,
    responses={201: FieldSerializer, 400: OpenApiTypes.OBJECT, 403: OpenApiTypes.OBJECT},
)
class FieldMergeView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserRole]

    def post(self, request):
        serializer = FieldMergeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        source_ids = serializer.validated_data["source_ids"]

        with transaction.atomic():
            sources = list(Field.objects.filter(pk__in=source_ids).prefetch_related("assigned_agents"))
            found_ids = {f.id for f in sources}
            missing = set(source_ids) - found_ids
            if missing:
                raise ValidationError({"source_ids": f"Unknown field ids: {sorted(missing)}"})

            new_field = Field.objects.create(
                name=serializer.validated_data["name"],
                crop_type=serializer.validated_data["crop_type"],
                planting_date=serializer.validated_data["planting_date"],
                current_stage=serializer.validated_data["current_stage"],
                notes=serializer.validated_data.get("notes") or "",
            )

            agent_ids = set(serializer.validated_data.get("assigned_agent_ids") or [])
            for s in sources:
                for a in s.assigned_agents.all():
                    agent_ids.add(a.id)
            agents = User.objects.filter(id__in=agent_ids, role=User.Role.AGENT)
            new_field.assigned_agents.set(agents)

            FieldUpdate.objects.filter(field_id__in=source_ids).update(field=new_field)

            for s in sources:
                for agent in s.assigned_agents.all():
                    if agent.id == request.user.id:
                        continue
                    Notification.objects.create(
                        recipient=agent,
                        kind=Notification.Kind.FIELD_MERGED_AWAY,
                        title=f'Field "{s.name}" was merged',
                        body=f'It is now part of "{new_field.name}".',
                        related_field_id=s.id,
                        target_field=new_field,
                    )
                    trim_notifications_for_recipient(agent.id)

            Field.objects.filter(pk__in=source_ids).delete()
            new_field.refresh_status(save=True)

        new_field = Field.objects.prefetch_related("assigned_agents").get(pk=new_field.pk)
        return Response(FieldSerializer(new_field).data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["notifications"],
    summary="List notifications (newest 50)",
    responses={200: NotificationSerializer(many=True)},
)
class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(recipient=request.user).order_by("-created_at")[:50]
        return Response(NotificationSerializer(qs, many=True).data)


_mark_read = inline_serializer(
    name="NotificationMarkRead",
    fields={"ids": drf_serializers.ListField(child=drf_serializers.IntegerField(), required=False)},
)


@extend_schema(
    tags=["notifications"],
    summary="Mark notifications read",
    request=_mark_read,
    responses={204: None},
    description="Omit `ids` (or send empty list) to mark all as read.",
)
class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ids = request.data.get("ids")
        qs = Notification.objects.filter(recipient=request.user)
        if isinstance(ids, list) and len(ids) > 0:
            qs = qs.filter(pk__in=ids)
        qs.update(is_read=True)
        return Response(status=status.HTTP_204_NO_CONTENT)


class EventStreamRenderer(BaseRenderer):
    """Pass-through renderer so DRF's content negotiation accepts `Accept: text/event-stream`.

    The view returns a `StreamingHttpResponse` directly, so this `render` method is never invoked
    for the success path; it exists so error/auth responses can still be negotiated without
    crashing `perform_content_negotiation(force=True)` (which does `renderers[0]`).
    """

    media_type = "text/event-stream"
    format = "txt"
    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if data is None:
            return b""
        if isinstance(data, (bytes, bytearray)):
            return bytes(data)
        if isinstance(data, str):
            return data.encode(self.charset)
        return json.dumps(data).encode(self.charset)


@extend_schema(
    tags=["events"],
    summary="Server-sent events stream (authenticated)",
    responses={200: OpenApiTypes.OBJECT},
    description="Long-lived `text/event-stream`. Sends `data: {json}` with type `notification` on new rows.",
)
class EventStreamView(APIView):
    """SSE endpoint. Uses a custom renderer that advertises `text/event-stream` so DRF's
    content negotiation passes for both the streaming success path and any error responses
    (401 / 403) generated by the auth layer."""

    permission_classes = [IsAuthenticated]
    renderer_classes = [EventStreamRenderer]

    def get(self, request):
        user = request.user

        def event_generator():
            q = pubsub.subscribe(user.id)
            try:
                while True:
                    try:
                        event = q.get(timeout=15)
                    except Empty:
                        yield ": keepalive\n\n"
                        continue
                    yield f"data: {json.dumps(event)}\n\n"
            finally:
                pubsub.unsubscribe(user.id, q)

        response = StreamingHttpResponse(event_generator(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response
