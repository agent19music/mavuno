from __future__ import annotations

from django.db.models.signals import post_save
from django.dispatch import receiver

from . import pubsub
from .models import Notification
from .serializers import NotificationSerializer


@receiver(post_save, sender=Notification)
def notification_post_save(sender, instance: Notification, created: bool, **kwargs):
    if not created:
        return
    data = NotificationSerializer(instance).data
    pubsub.publish(instance.recipient_id, {"type": "notification", "notification": data})
