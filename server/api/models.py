from datetime import timedelta

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        AGENT = "agent", "Field Agent"

    email = models.EmailField(_("email address"), blank=True, unique=True)

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.AGENT,
    )
    assigned_fields = models.ManyToManyField(
        "Field",
        related_name="assigned_agents",
        blank=True,
    )

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_agent(self):
        return self.role == self.Role.AGENT


class Field(models.Model):
    class Stage(models.TextChoices):
        PLANTED = "planted", "Planted"
        GROWING = "growing", "Growing"
        READY = "ready", "Ready"
        HARVESTED = "harvested", "Harvested"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        AT_RISK = "at_risk", "At Risk"
        COMPLETED = "completed", "Completed"

    STAGE_ORDER = {
        Stage.PLANTED: 0,
        Stage.GROWING: 1,
        Stage.READY: 2,
        Stage.HARVESTED: 3,
    }

    name = models.CharField(max_length=200)
    crop_type = models.CharField(max_length=100)
    planting_date = models.DateField()
    current_stage = models.CharField(
        max_length=50,
        choices=Stage.choices,
        default=Stage.PLANTED,
        db_index=True,
    )
    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["current_stage"]),
            models.Index(fields=["planting_date"]),
        ]

    def can_transition_to(self, next_stage):
        if next_stage not in self.STAGE_ORDER:
            return False
        current_index = self.STAGE_ORDER.get(self.current_stage, 0)
        next_index = self.STAGE_ORDER[next_stage]
        # Allow idempotent updates and single-step progression only.
        return next_index in (current_index, current_index + 1)

    def has_inconsistent_progression(self):
        updates = list(self.updates.order_by("timestamp").values_list("stage", flat=True))
        if not updates:
            return False
        max_seen = -1
        for stage in updates:
            stage_index = self.STAGE_ORDER.get(stage, -1)
            if stage_index < max_seen:
                return True
            max_seen = max(max_seen, stage_index)
        return False

    def evaluate_status(self, now=None):
        now = now or timezone.now()
        if self.current_stage == self.Stage.HARVESTED:
            return self.Status.COMPLETED

        latest_update = self.updates.order_by("-timestamp").first()
        if latest_update and latest_update.timestamp < now - timedelta(days=7):
            return self.Status.AT_RISK

        if self.has_inconsistent_progression():
            return self.Status.AT_RISK

        return self.Status.ACTIVE

    def refresh_status(self, save=True):
        self.status = self.evaluate_status()
        if save:
            self.save(update_fields=["status", "updated_at"])
        return self.status


class FieldUpdate(models.Model):
    field = models.ForeignKey(Field, on_delete=models.CASCADE, related_name="updates")
    stage = models.CharField(max_length=50, choices=Field.Stage.choices)
    notes = models.TextField(blank=True)
    agent = models.ForeignKey(User, on_delete=models.CASCADE, related_name="field_updates")
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-timestamp",)
        indexes = [
            models.Index(fields=["timestamp"]),
        ]


class Notification(models.Model):
    """In-app notification (persisted); SSE pushes mirror rows to connected clients."""

    class Kind(models.TextChoices):
        FIELD_DELETED = "field_deleted", "Field deleted"
        FIELD_MERGED_AWAY = "field_merged_away", "Field merged away"

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    kind = models.CharField(max_length=40, choices=Kind.choices, db_index=True)
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    # Survives when the Field row is gone (delete / merge source removal).
    related_field_id = models.IntegerField(null=True, blank=True)
    target_field = models.ForeignKey(
        Field,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="merge_notifications",
    )
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["recipient", "-created_at"]),
        ]


NOTIFICATION_RETENTION = 50


def trim_notifications_for_recipient(recipient_id: int) -> None:
    """Keep at most NOTIFICATION_RETENTION rows per recipient (newest first)."""
    ids = list(
        Notification.objects.filter(recipient_id=recipient_id)
        .order_by("-created_at")
        .values_list("pk", flat=True)[NOTIFICATION_RETENTION:]
    )
    if ids:
        Notification.objects.filter(pk__in=ids).delete()
