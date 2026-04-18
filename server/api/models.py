from datetime import timedelta

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        AGENT = "agent", "Field Agent"

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
