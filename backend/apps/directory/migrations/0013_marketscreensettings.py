from django.db import migrations, models


def seed_market_screen_settings(apps, schema_editor):
    MarketScreenSettings = apps.get_model("directory", "MarketScreenSettings")
    MarketScreenSettings.objects.get_or_create(
        scope="global",
        defaults={"hero_auto_scroll_seconds": 5},
    )


class Migration(migrations.Migration):

    dependencies = [
        ("directory", "0012_product_taxonomy_v1"),
    ]

    operations = [
        migrations.CreateModel(
            name="MarketScreenSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "scope",
                    models.CharField(
                        choices=[("global", "Global")],
                        default="global",
                        max_length=20,
                        unique=True,
                    ),
                ),
                (
                    "hero_auto_scroll_seconds",
                    models.PositiveSmallIntegerField(
                        choices=[(3, "3 seconds"), (5, "5 seconds")],
                        default=5,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["id"],
            },
        ),
        migrations.RunPython(seed_market_screen_settings, migrations.RunPython.noop),
    ]
