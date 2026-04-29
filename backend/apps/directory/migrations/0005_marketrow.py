from django.db import migrations, models


def seed_market_rows(apps, schema_editor):
    MarketRow = apps.get_model("directory", "MarketRow")

    rows = [
        {
            "title": "Premium Companies",
            "row_type": "company_tier",
            "layout": "hero_company",
            "target_visibility_type": "featured",
            "sort_order": 10,
            "is_enabled": True,
        },
        {
            "title": "Pro Companies",
            "row_type": "company_tier",
            "layout": "rail_company",
            "target_visibility_type": "pro",
            "sort_order": 20,
            "is_enabled": True,
        },
        {
            "title": "Normal Companies",
            "row_type": "company_tier",
            "layout": "grid_company",
            "target_visibility_type": "normal",
            "sort_order": 30,
            "is_enabled": True,
        },
    ]

    for row in rows:
        MarketRow.objects.update_or_create(
            row_type=row["row_type"],
            target_visibility_type=row["target_visibility_type"],
            defaults=row,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("directory", "0004_alter_company_options_alter_product_options_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="MarketRow",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=140)),
                (
                    "row_type",
                    models.CharField(
                        choices=[
                            ("company_tier", "Company Tier"),
                            ("featured_product_collection", "Featured Product Collection"),
                            ("category_collection", "Category Collection"),
                        ],
                        default="company_tier",
                        max_length=40,
                    ),
                ),
                (
                    "layout",
                    models.CharField(
                        choices=[
                            ("hero_company", "Hero Company"),
                            ("grid_company", "Grid Company"),
                            ("rail_company", "Rail Company"),
                        ],
                        default="rail_company",
                        max_length=40,
                    ),
                ),
                (
                    "target_visibility_type",
                    models.CharField(
                        choices=[("featured", "Featured"), ("pro", "Pro"), ("normal", "Normal")],
                        max_length=20,
                    ),
                ),
                ("sort_order", models.PositiveIntegerField(default=0)),
                ("is_enabled", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["sort_order", "id"]},
        ),
        migrations.RunPython(seed_market_rows, migrations.RunPython.noop),
    ]
