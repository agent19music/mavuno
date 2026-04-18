from datetime import timedelta

from django.contrib.auth import login, logout
from django.contrib.auth import get_user_model
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Field, FieldUpdate
from .permissions import CanViewField, CanViewFieldUpdates, IsAdminUserRole
from .serializers import (
    AdminDashboardSerializer,
    AgentDashboardSerializer,
    FieldAgentUpdateSerializer,
    FieldSerializer,
    FieldUpdateSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


@api_view(["GET"])
@permission_classes([AllowAny])
def health(_request):
    return Response({"status": "ok"})


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        login(request, user)
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


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


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


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


class FieldUpdatesView(APIView):
    permission_classes = [IsAuthenticated, CanViewFieldUpdates]

    def get(self, request, pk):
        field = get_object_or_404(Field.objects.prefetch_related("assigned_agents"), pk=pk)
        self.check_object_permissions(request, field)
        updates = field.updates.select_related("agent").all()
        serializer = FieldUpdateSerializer(updates, many=True)
        return Response(serializer.data)


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
