"""
Idempotent admin bootstrap for production.

Reads credentials from environment variables and ensures a single admin user
exists. Designed to be safe to call on every container start:

  - If the user is missing, it is created with role=admin.
  - If the user already exists, it is left alone (NOT password-reset).
    Use --reset-password to override (e.g. lost-password recovery flow).
  - If the env vars are not set, the command is a no-op so deployments that
    bootstrap admins by hand are not disturbed.

Required env vars (all-or-nothing):
  MAVUNO_ADMIN_EMAIL       e.g. ops@yourcompany.com
  MAVUNO_ADMIN_PASSWORD    strong, set via your secret manager

Optional:
  MAVUNO_ADMIN_USERNAME    defaults to the local-part of the email
  MAVUNO_ADMIN_FIRST_NAME  defaults to "Mavuno"
  MAVUNO_ADMIN_LAST_NAME   defaults to "Admin"

The password is NEVER logged.
"""
from __future__ import annotations

import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

User = get_user_model()


class Command(BaseCommand):
    help = "Idempotently ensure a single admin user exists from env vars (prod-safe)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset-password",
            action="store_true",
            help="If the admin already exists, overwrite their password from MAVUNO_ADMIN_PASSWORD.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        email = os.environ.get("MAVUNO_ADMIN_EMAIL", "").strip()
        password = os.environ.get("MAVUNO_ADMIN_PASSWORD", "")

        if not email or not password:
            self.stdout.write(
                "ensure_admin: MAVUNO_ADMIN_EMAIL/MAVUNO_ADMIN_PASSWORD not set — skipping."
            )
            return

        username = os.environ.get("MAVUNO_ADMIN_USERNAME", "").strip() or email.split("@", 1)[0]
        first_name = os.environ.get("MAVUNO_ADMIN_FIRST_NAME", "Mavuno")
        last_name = os.environ.get("MAVUNO_ADMIN_LAST_NAME", "Admin")
        reset = bool(options.get("reset_password"))

        existing = User.objects.filter(email__iexact=email).first()
        if existing is None:
            user = User(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                role=User.Role.ADMIN,
            )
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f"ensure_admin: created admin {email}"))
            return

        if existing.role != User.Role.ADMIN:
            existing.role = User.Role.ADMIN
            existing.save(update_fields=["role"])
            self.stdout.write(self.style.WARNING(f"ensure_admin: promoted {email} to admin"))

        if reset:
            existing.set_password(password)
            existing.save()
            self.stdout.write(self.style.SUCCESS(f"ensure_admin: reset password for {email}"))
            return

        self.stdout.write(f"ensure_admin: admin {email} already exists — leaving untouched.")
