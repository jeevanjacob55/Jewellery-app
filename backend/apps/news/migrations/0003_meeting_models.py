from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("news", "0002_news_and_newstarget"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Meeting",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField()),
                (
                    "organizer_type",
                    models.CharField(
                        choices=[("platform", "Platform"), ("association", "Association"), ("unit", "Unit"), ("company", "Company")],
                        max_length=20,
                    ),
                ),
                ("organizer_id", models.PositiveBigIntegerField(blank=True, null=True)),
                ("start_datetime", models.DateTimeField()),
                ("end_datetime", models.DateTimeField()),
                ("venue_name", models.CharField(blank=True, max_length=255)),
                ("venue_address", models.TextField(blank=True)),
                ("google_maps_link", models.URLField(blank=True)),
                (
                    "meeting_mode",
                    models.CharField(choices=[("physical", "Physical"), ("online", "Online"), ("hybrid", "Hybrid")], max_length=20),
                ),
                ("online_meeting_link", models.URLField(blank=True)),
                (
                    "status",
                    models.CharField(choices=[("draft", "Draft"), ("published", "Published"), ("cancelled", "Cancelled"), ("completed", "Completed")], default="draft", max_length=20),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_meetings",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["start_datetime", "id"]},
        ),
        migrations.CreateModel(
            name="MeetingTarget",
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
                ("meeting", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="targets", to="news.meeting")),
            ],
        ),
        migrations.CreateModel(
            name="MeetingResponse",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("response", models.CharField(choices=[("attending", "Attending"), ("maybe", "Maybe"), ("not_attending", "Not Attending")], max_length=20)),
                ("responded_at", models.DateTimeField(auto_now=True)),
                ("meeting", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="responses", to="news.meeting")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="meeting_responses", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(
            model_name="meetingtarget",
            constraint=models.UniqueConstraint(fields=("meeting", "target_type", "target_id", "mode"), name="uniq_meeting_target_mode"),
        ),
        migrations.AddConstraint(
            model_name="meetingresponse",
            constraint=models.UniqueConstraint(fields=("meeting", "user"), name="uniq_meeting_user_response"),
        ),
    ]
