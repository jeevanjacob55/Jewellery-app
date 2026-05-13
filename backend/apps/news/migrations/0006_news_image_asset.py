import mimetypes
from pathlib import Path

from django.db import migrations, models


def migrate_news_images_to_media_assets(apps, schema_editor):
    News = apps.get_model("news", "News")
    MediaAsset = apps.get_model("directory", "MediaAsset")

    for news in News.objects.exclude(image="").filter(image_asset__isnull=True):
        if not news.image:
            continue

        object_key = str(news.image)
        original_filename = Path(object_key).name
        mime_type, _ = mimetypes.guess_type(original_filename)
        public_url = ""
        try:
            public_url = news.image.url
        except Exception:
            public_url = ""
        try:
            file_size = int(news.image.size or 0)
        except Exception:
            file_size = 0

        media_asset, _ = MediaAsset.objects.get_or_create(
            object_key=object_key,
            defaults={
                "uploader_id": news.created_by_id,
                "bucket_name": "legacy-local-media",
                "original_filename": original_filename,
                "mime_type": mime_type or "application/octet-stream",
                "public_url": public_url,
                "width": 0,
                "height": 0,
                "file_size": file_size,
                "visibility": "public",
                "moderation_status": "approved",
            },
        )
        news.image_asset_id = media_asset.id
        news.save(update_fields=["image_asset"])


class Migration(migrations.Migration):

    dependencies = [
        ("directory", "0014_productvisibilitytarget"),
        ("news", "0005_newsbookmark"),
    ]

    operations = [
        migrations.AddField(
            model_name="news",
            name="image_asset",
            field=models.OneToOneField(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name="news_item", to="directory.mediaasset"),
        ),
        migrations.RunPython(migrate_news_images_to_media_assets, migrations.RunPython.noop),
    ]
