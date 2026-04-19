from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers

from .models import Field, FieldUpdate, Notification

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "role")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("username", "email", "password", "first_name", "last_name", "role")

    def validate_role(self, value):
        request = self.context.get("request")
        if value == User.Role.ADMIN and request and request.user.is_authenticated and not request.user.is_admin:
            raise serializers.ValidationError("Only admins can create admin users.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class AgentCreateSerializer(serializers.ModelSerializer):
    """Admin-only: create a field agent user."""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("username", "email", "password", "first_name", "last_name")

    def create(self, validated_data):
        validated_data["role"] = User.Role.AGENT
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class AgentUpdateSerializer(serializers.ModelSerializer):
    """Admin-only: update an existing field agent profile."""

    class Meta:
        model = User
        fields = ("username", "email", "first_name", "last_name")


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs["email"]
        password = attrs["password"]
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist as exc:
            raise serializers.ValidationError("Invalid credentials.") from exc
        authenticated = authenticate(username=user.username, password=password)
        if not authenticated:
            raise serializers.ValidationError("Invalid credentials.")
        attrs["user"] = authenticated
        return attrs


class FieldSerializer(serializers.ModelSerializer):
    assigned_agent_ids = serializers.PrimaryKeyRelatedField(
        source="assigned_agents",
        many=True,
        queryset=User.objects.filter(role=User.Role.AGENT),
        required=False,
        write_only=True,
    )
    assigned_agents = UserSerializer(many=True, read_only=True)

    class Meta:
        model = Field
        fields = (
            "id",
            "name",
            "crop_type",
            "planting_date",
            "current_stage",
            "status",
            "notes",
            "assigned_agent_ids",
            "assigned_agents",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at", "status", "assigned_agents")

    def validate_current_stage(self, value):
        if self.instance and not self.instance.can_transition_to(value):
            raise serializers.ValidationError("Invalid stage transition.")
        return value

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        instance.refresh_status(save=True)
        return instance


class FieldAgentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Field
        fields = ("current_stage", "notes")

    def validate_current_stage(self, value):
        if self.instance and not self.instance.can_transition_to(value):
            raise serializers.ValidationError("Invalid stage transition.")
        return value

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        instance.refresh_status(save=True)
        return instance


class FieldUpdateSerializer(serializers.ModelSerializer):
    agent = UserSerializer(read_only=True)
    field_name = serializers.CharField(source="field.name", read_only=True)

    class Meta:
        model = FieldUpdate
        fields = ("id", "field", "field_name", "stage", "notes", "agent", "timestamp")
        read_only_fields = ("id", "timestamp", "agent", "field_name")


class NotificationSerializer(serializers.ModelSerializer):
    target_field_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Notification
        fields = (
            "id",
            "kind",
            "title",
            "body",
            "related_field_id",
            "target_field_id",
            "is_read",
            "created_at",
        )
        read_only_fields = fields


class FieldMergeSerializer(serializers.Serializer):
    source_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
        min_length=2,
    )
    name = serializers.CharField(max_length=200)
    crop_type = serializers.CharField(max_length=100)
    planting_date = serializers.DateField()
    current_stage = serializers.ChoiceField(choices=Field.Stage.choices)
    notes = serializers.CharField(allow_blank=True, required=False, default="")
    assigned_agent_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        default=list,
    )

    def validate_source_ids(self, value):
        unique = list(dict.fromkeys(value))
        if len(unique) < 2:
            raise serializers.ValidationError("Select at least two distinct fields to merge.")
        return unique

    def validate_assigned_agent_ids(self, value):
        return list(dict.fromkeys(value or []))

    def validate(self, attrs):
        agent_ids = attrs.get("assigned_agent_ids") or []
        invalid = User.objects.filter(id__in=agent_ids).exclude(role=User.Role.AGENT)
        if invalid.exists():
            raise serializers.ValidationError({"assigned_agent_ids": "Only field agents may be assigned."})
        return attrs


class AdminDashboardSerializer(serializers.Serializer):
    total_fields = serializers.IntegerField()
    status_breakdown = serializers.DictField(child=serializers.IntegerField())
    total_agents = serializers.IntegerField()
    recent_updates = serializers.IntegerField()


class AgentDashboardSerializer(serializers.Serializer):
    assigned_fields = serializers.IntegerField()
    status_breakdown = serializers.DictField(child=serializers.IntegerField())
    my_recent_updates = serializers.IntegerField()
