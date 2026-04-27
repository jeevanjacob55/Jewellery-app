from django.core.management.base import BaseCommand

from apps.admin_ops.demo_seed import DEMO_PASSWORD, seed_demo_data


class Command(BaseCommand):
    help = "Seed deterministic demo data for local development."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Clear the seeded demo domain tables before repopulating them.",
        )

    def handle(self, *args, **options):
        seed_demo_data(reset=options["reset"])
        reset_suffix = " after reset" if options["reset"] else ""
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded demo data{reset_suffix}. Demo login password for demo users: {DEMO_PASSWORD}"
            )
        )
