from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ads', '0002_remove_adtargeting_district_name_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='adtargeting',
            name='district_name',
        ),
        migrations.RemoveField(
            model_name='adtargeting',
            name='local_chapter_name',
        ),
        migrations.RemoveField(
            model_name='adtargeting',
            name='state_name',
        ),
    ]
