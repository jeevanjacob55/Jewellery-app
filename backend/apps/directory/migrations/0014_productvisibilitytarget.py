from django.db import migrations, models
import django.db.models.deletion


def seed_product_visibility_targets(apps, schema_editor):
    Product = apps.get_model("directory", "Product")
    ProductVisibilityTarget = apps.get_model("directory", "ProductVisibilityTarget")

    existing_product_ids = set(
        ProductVisibilityTarget.objects.filter(
            mode="include",
            target_type="platform",
            target_id__isnull=True,
        ).values_list("product_id", flat=True)
    )

    ProductVisibilityTarget.objects.bulk_create(
        [
            ProductVisibilityTarget(
                product_id=product_id,
                target_type="platform",
                target_id=None,
                mode="include",
            )
            for product_id in Product.objects.exclude(id__in=existing_product_ids).values_list("id", flat=True)
        ]
    )


class Migration(migrations.Migration):

    dependencies = [
        ("directory", "0013_marketscreensettings"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductVisibilityTarget",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "target_type",
                    models.CharField(
                        choices=[
                            ("platform", "Platform"),
                            ("state", "State"),
                            ("association", "Association"),
                            ("unit", "Unit"),
                            ("company", "Company"),
                            ("user", "User"),
                        ],
                        max_length=20,
                    ),
                ),
                ("target_id", models.PositiveBigIntegerField(blank=True, null=True)),
                (
                    "mode",
                    models.CharField(
                        choices=[("include", "Include"), ("exclude", "Exclude")],
                        max_length=10,
                    ),
                ),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="visibility_targets",
                        to="directory.product",
                    ),
                ),
            ],
            options={},
        ),
        migrations.AddConstraint(
            model_name="productvisibilitytarget",
            constraint=models.UniqueConstraint(
                fields=("product", "target_type", "target_id", "mode"),
                name="uniq_product_visibility_target_mode",
            ),
        ),
        migrations.RunPython(seed_product_visibility_targets, migrations.RunPython.noop),
    ]
