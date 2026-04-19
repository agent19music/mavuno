import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0002_alter_user_email"),
    ]

    operations = [
        migrations.CreateModel(
            name="Notification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "kind",
                    models.CharField(
                        choices=[
                            ("field_deleted", "Field deleted"),
                            ("field_merged_away", "Field merged away"),
                        ],
                        db_index=True,
                        max_length=40,
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                ("body", models.TextField(blank=True)),
                ("related_field_id", models.IntegerField(blank=True, null=True)),
                ("is_read", models.BooleanField(db_index=True, default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "recipient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notifications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "target_field",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="merge_notifications",
                        to="api.field",
                    ),
                ),
            ],
            options={
                "ordering": ("-created_at",),
            },
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(fields=["recipient", "-created_at"], name="api_notif_recipient_created"),
        ),
    ]
