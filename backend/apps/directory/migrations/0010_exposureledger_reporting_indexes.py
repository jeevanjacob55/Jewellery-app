from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("directory", "0009_market_mixed_feed_runtime"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="exposureledger",
            index=models.Index(fields=["served_at"], name="directory_exp_served_idx"),
        ),
        migrations.AddIndex(
            model_name="exposureledger",
            index=models.Index(fields=["zone", "served_at"], name="directory_exp_zone_served_idx"),
        ),
        migrations.AddIndex(
            model_name="exposureledger",
            index=models.Index(fields=["tier", "served_at"], name="directory_exp_tier_served_idx"),
        ),
        migrations.AddIndex(
            model_name="exposureledger",
            index=models.Index(fields=["company", "zone", "served_at"], name="dir_exp_comp_zone_serv_idx"),
        ),
    ]
