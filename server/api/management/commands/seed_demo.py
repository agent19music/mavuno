from datetime import date

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Field, FieldUpdate

User = get_user_model()

DEMO_PASSWORD = "Password123!"


class Command(BaseCommand):
    help = "Idempotent demo users, fields, assignments, and sample updates (SmartSeason assessment)."

    @transaction.atomic
    def handle(self, *args, **options):
        admin, _ = User.objects.get_or_create(
            username="admin.mavuno",
            defaults={
                "email": "admin@mavuno.local",
                "first_name": "Mavuno",
                "last_name": "Admin",
                "role": User.Role.ADMIN,
            },
        )
        admin.email = "admin@mavuno.local"
        admin.role = User.Role.ADMIN
        admin.set_password(DEMO_PASSWORD)
        admin.save()

        anne, _ = User.objects.get_or_create(
            username="agent.anne",
            defaults={
                "email": "anne@mavuno.local",
                "first_name": "Anne",
                "last_name": "Mwangi",
                "role": User.Role.AGENT,
            },
        )
        anne.set_password(DEMO_PASSWORD)
        anne.role = User.Role.AGENT
        anne.save()

        juma, _ = User.objects.get_or_create(
            username="agent.juma",
            defaults={
                "email": "juma@mavuno.local",
                "first_name": "Juma",
                "last_name": "Otieno",
                "role": User.Role.AGENT,
            },
        )
        juma.set_password(DEMO_PASSWORD)
        juma.role = User.Role.AGENT
        juma.save()

        field_specs = [
            {
                "name": "North Plot",
                "crop_type": "Maize",
                "planting_date": date(2026, 2, 10),
                "current_stage": Field.Stage.GROWING,
                "notes": "Healthy growth and stable moisture.",
                "agents": [anne],
            },
            {
                "name": "River Bend",
                "crop_type": "Beans",
                "planting_date": date(2026, 2, 1),
                "current_stage": Field.Stage.READY,
                "notes": "Early flowering; monitor leaf color.",
                "agents": [juma],
            },
            {
                "name": "South Terrace",
                "crop_type": "Tomatoes",
                "planting_date": date(2026, 1, 26),
                "current_stage": Field.Stage.GROWING,
                "notes": "Mild pest pressure at perimeter.",
                "agents": [juma],
            },
            {
                "name": "East Ridge",
                "crop_type": "Sunflower",
                "planting_date": date(2026, 2, 20),
                "current_stage": Field.Stage.PLANTED,
                "notes": "Uniform emergence after first rain.",
                "agents": [anne],
            },
        ]

        for spec in field_specs:
            field, created = Field.objects.get_or_create(
                name=spec["name"],
                defaults={
                    "crop_type": spec["crop_type"],
                    "planting_date": spec["planting_date"],
                    "current_stage": spec["current_stage"],
                    "notes": spec["notes"],
                },
            )
            if not created:
                field.crop_type = spec["crop_type"]
                field.planting_date = spec["planting_date"]
                field.current_stage = spec["current_stage"]
                field.notes = spec["notes"]
                field.save()
            field.assigned_agents.set(spec["agents"])
            field.refresh_status(save=True)

        # Sample updates (only create if none exist for that field)
        north = Field.objects.get(name="North Plot")
        if not north.updates.exists():
            FieldUpdate.objects.create(
                field=north,
                stage=Field.Stage.PLANTED,
                notes="Planted and irrigated.",
                agent=anne,
            )
            FieldUpdate.objects.create(
                field=north,
                stage=Field.Stage.GROWING,
                notes="Leaf expansion visible.",
                agent=anne,
            )
            north.refresh_status(save=True)

        bend = Field.objects.get(name="River Bend")
        if not bend.updates.exists():
            FieldUpdate.objects.create(
                field=bend,
                stage=Field.Stage.GROWING,
                notes="Flowering visible in central rows.",
                agent=juma,
            )
            bend.refresh_status(save=True)

        self.stdout.write(
            self.style.SUCCESS(
                "Demo data ready. Admin: admin@mavuno.local / "
                f"{DEMO_PASSWORD} — Agents: anne@mavuno.local, juma@mavuno.local / {DEMO_PASSWORD}"
            )
        )
