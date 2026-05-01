from django.db import migrations, models


def activate_latest_products_zone(apps, schema_editor):
    MarketZone = apps.get_model("directory", "MarketZone")
    MarketZone.objects.filter(key="latest_products").update(
        serving_mode="latest_products",
        layout="grid_product",
    )


class Migration(migrations.Migration):

    dependencies = [
        ("directory", "0008_market_zone_runtime_controls"),
    ]

    operations = [
        migrations.AlterField(
            model_name="marketzone",
            name="layout",
            field=models.CharField(
                choices=[
                    ("hero_company", "Hero Company"),
                    ("grid_company", "Grid Company"),
                    ("rail_company", "Rail Company"),
                    ("rail_product", "Rail Product"),
                    ("grid_product", "Grid Product"),
                ],
                default="rail_company",
                max_length=40,
            ),
        ),
        migrations.AlterField(
            model_name="marketzone",
            name="serving_mode",
            field=models.CharField(
                choices=[
                    ("scheduled_hero", "Scheduled Hero"),
                    ("weighted_companies", "Weighted Companies"),
                    ("latest_products", "Latest Products"),
                    ("dormant", "Dormant"),
                ],
                default="dormant",
                max_length=40,
            ),
        ),
        migrations.RunPython(activate_latest_products_zone, migrations.RunPython.noop),
    ]
