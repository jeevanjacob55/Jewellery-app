from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("directory", "0014_productvisibilitytarget"),
        ("rates", "0003_associationratecategory_associationratesubcategory_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="AssociationSpotlightMedia",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(blank=True, max_length=140)),
                ("subtitle", models.CharField(blank=True, max_length=255)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("starts_at", models.DateTimeField(blank=True, null=True)),
                ("ends_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "asset",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="association_spotlight_media",
                        to="directory.mediaasset",
                    ),
                ),
                (
                    "association",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="spotlight_media",
                        to="regions.association",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_association_spotlight_media",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["sort_order", "id"]},
        ),
    ]
