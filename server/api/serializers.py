from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers

from .models import Field, FieldUpdate

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
    )

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
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at", "status")

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

    class Meta:
        model = FieldUpdate
        fields = ("id", "field", "stage", "notes", "agent", "timestamp")
        read_only_fields = ("id", "timestamp", "agent")


class AdminDashboardSerializer(serializers.Serializer):
    total_fields = serializers.IntegerField()
    status_breakdown = serializers.DictField(child=serializers.IntegerField())
    total_agents = serializers.IntegerField()
    recent_updates = serializers.IntegerField()


class AgentDashboardSerializer(serializers.Serializer):
    assigned_fields = serializers.IntegerField()
    status_breakdown = serializers.DictField(child=serializers.IntegerField())
    my_recent_updates = serializers.IntegerField()
