from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import Field


class Command(BaseCommand):
    help = "Advance field stages based on age thresholds."

    def add_arguments(self, parser):
        parser.add_argument(
            "--growing-to-ready-days",
            type=int,
            default=60,
            help="Days after planting to move growing fields to ready.",
        )

    def handle(self, *args, **options):
        now = timezone.now()
        planted_threshold = now.date() - timedelta(days=30)
        growing_threshold = now.date() - timedelta(days=options["growing_to_ready_days"])

        planted_qs = Field.objects.filter(
            current_stage=Field.Stage.PLANTED,
            planting_date__lte=planted_threshold,
        )
        growing_qs = Field.objects.filter(
            current_stage=Field.Stage.GROWING,
            planting_date__lte=growing_threshold,
        )

        advanced_count = 0
        for field in planted_qs:
            field.current_stage = Field.Stage.GROWING
            field.refresh_status(save=True)
            advanced_count += 1

        for field in growing_qs:
            field.current_stage = Field.Stage.READY
            field.refresh_status(save=True)
            advanced_count += 1

        self.stdout.write(self.style.SUCCESS(f"Advanced {advanced_count} fields."))
