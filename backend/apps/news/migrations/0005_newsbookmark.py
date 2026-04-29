from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("news", "0004_news_image"),
    ]

    operations = [
        migrations.CreateModel(
            name="NewsBookmark",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("news", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="bookmarks", to="news.news")),
                ("user", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="news_bookmarks", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(
            model_name="newsbookmark",
            constraint=models.UniqueConstraint(fields=("user", "news"), name="uniq_news_bookmark_user_news"),
        ),
    ]
