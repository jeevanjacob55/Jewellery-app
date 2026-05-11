from django.db import migrations, models
from django.utils.text import slugify


def populate_category_slugs(apps, schema_editor):
    ProductCategory = apps.get_model("directory", "ProductCategory")

    for category in ProductCategory.objects.all().order_by("id"):
        base_slug = slugify(category.name) or "category"
        candidate = base_slug
        if ProductCategory.objects.exclude(pk=category.pk).filter(slug=candidate).exists():
            candidate = f"{category.product_type}-{base_slug}"
        suffix = 2
        while ProductCategory.objects.exclude(pk=category.pk).filter(slug=candidate).exists():
            candidate = f"{category.product_type}-{base_slug}-{suffix}"
            suffix += 1
        category.slug = candidate
        category.save(update_fields=["slug"])


class Migration(migrations.Migration):
    dependencies = [
        ("directory", "0011_companytierchangerequest"),
    ]

    operations = [
        migrations.AddField(
            model_name="productcategory",
            name="product_type",
            field=models.CharField(
                choices=[("gold", "Gold"), ("diamond", "Diamond"), ("silver", "Silver"), ("other", "Other")],
                default="gold",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="productcategory",
            name="slug",
            field=models.SlugField(blank=True, max_length=120, null=True),
        ),
        migrations.RunPython(populate_category_slugs, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="productcategory",
            name="name",
            field=models.CharField(max_length=100),
        ),
        migrations.AlterField(
            model_name="productcategory",
            name="slug",
            field=models.SlugField(max_length=120, unique=True),
        ),
        migrations.AlterModelOptions(
            name="productcategory",
            options={"ordering": ["product_type", "display_order", "name", "id"]},
        ),
        migrations.AddConstraint(
            model_name="productcategory",
            constraint=models.UniqueConstraint(fields=("product_type", "name"), name="uniq_product_category_name_per_type"),
        ),
    ]
