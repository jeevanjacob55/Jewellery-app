from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('regions', '0002_alter_regiondistrict_unique_together_and_more'),
    ]

    operations = [
        migrations.DeleteModel(
            name='LocalChapter',
        ),
        migrations.DeleteModel(
            name='RegionDistrict',
        ),
    ]
