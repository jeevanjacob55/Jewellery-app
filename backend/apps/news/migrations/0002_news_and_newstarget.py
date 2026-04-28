from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("news", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="News",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField()),
                (
                    "publisher_type",
                    models.CharField(
                        choices=[("platform", "Platform"), ("association", "Association"), ("unit", "Unit"), ("company", "Company")],
                        max_length=20,
                    ),
                ),
                ("publisher_id", models.PositiveBigIntegerField(blank=True, null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("pending_approval", "Pending Approval"),
                            ("published", "Published"),
                            ("rejected", "Rejected"),
                            ("archived", "Archived"),
                        ],
                        default="draft",
                        max_length=20,
                    ),
                ),
                ("published_at", models.DateTimeField(blank=True, null=True)),
                ("rejection_reason", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "approved_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="approved_news_items",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_news_items",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-published_at", "-updated_at", "-id"]},
        ),
        migrations.CreateModel(
            name="NewsTarget",
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
                ("mode", models.CharField(choices=[("include", "Include"), ("exclude", "Exclude")], max_length=10)),
                ("news", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="targets", to="news.news")),
            ],
        ),
        migrations.AddConstraint(
            model_name="newstarget",
            constraint=models.UniqueConstraint(fields=("news", "target_type", "target_id", "mode"), name="uniq_news_target_mode"),
        ),
    ]
