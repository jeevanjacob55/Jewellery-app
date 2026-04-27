from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_remove_memberprofile_district_name_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='memberprofile',
            name='district_name',
        ),
        migrations.RemoveField(
            model_name='memberprofile',
            name='local_chapter_name',
        ),
        migrations.RemoveField(
            model_name='memberprofile',
            name='state_name',
        ),
    ]
