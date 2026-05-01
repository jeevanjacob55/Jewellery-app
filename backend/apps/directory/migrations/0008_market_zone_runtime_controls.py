from django.db import migrations, models


ZONE_RUNTIME_DEFAULTS = {
    "hero_spotlight": {
        "serving_mode": "scheduled_hero",
        "slot_interval_hours": 6,
        "cooldown_override_hours": None,
    },
    "featured_companies": {
        "serving_mode": "weighted_companies",
        "slot_interval_hours": 0,
        "cooldown_override_hours": None,
    },
    "rising_companies": {
        "serving_mode": "weighted_companies",
        "slot_interval_hours": 0,
        "cooldown_override_hours": None,
    },
    "latest_products": {
        "serving_mode": "dormant",
        "slot_interval_hours": 0,
        "cooldown_override_hours": None,
    },
}


def seed_zone_runtime_defaults(apps, schema_editor):
    MarketZone = apps.get_model("directory", "MarketZone")

    for zone_key, defaults in ZONE_RUNTIME_DEFAULTS.items():
        MarketZone.objects.filter(key=zone_key).update(**defaults)


class Migration(migrations.Migration):

    dependencies = [
        ("directory", "0007_market_visibility_foundation"),
    ]

    operations = [
        migrations.AddField(
            model_name="marketzone",
            name="cooldown_override_hours",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="marketzone",
            name="serving_mode",
            field=models.CharField(
                choices=[
                    ("scheduled_hero", "Scheduled Hero"),
                    ("weighted_companies", "Weighted Companies"),
                    ("dormant", "Dormant"),
                ],
                default="dormant",
                max_length=40,
            ),
        ),
        migrations.AddField(
            model_name="marketzone",
            name="slot_interval_hours",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.RunPython(seed_zone_runtime_defaults, migrations.RunPython.noop),
    ]
