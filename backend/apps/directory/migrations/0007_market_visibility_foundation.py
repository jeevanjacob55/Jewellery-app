import django.db.models.deletion
from django.db import migrations, models


TIER_SPECS = [
    {
        "name": "Prime Signature",
        "slug": "prime-signature",
        "description": "Top-tier featured placement for flagship companies.",
        "max_products": 50,
        "min_photos_per_product": 3,
        "max_photos_per_product": 5,
        "max_companies_allowed": 10,
        "price": "0.00",
        "is_free": False,
        "is_active": True,
        "base_weight": 12,
        "hero_eligible": True,
        "premium_floor_share": "20.00",
        "cooldown_hours": 24,
        "display_priority": 10,
        "visibility_type": "featured",
    },
    {
        "name": "Prime Classic",
        "slug": "prime-classic",
        "description": "Featured placement for established companies with a smaller slot count.",
        "max_products": 25,
        "min_photos_per_product": 3,
        "max_photos_per_product": 5,
        "max_companies_allowed": 25,
        "price": "0.00",
        "is_free": False,
        "is_active": True,
        "base_weight": 9,
        "hero_eligible": True,
        "premium_floor_share": "15.00",
        "cooldown_hours": 24,
        "display_priority": 20,
        "visibility_type": "featured",
    },
    {
        "name": "Prime Premier",
        "slug": "prime-premier",
        "description": "Priority pro listing for high-capacity suppliers.",
        "max_products": 15,
        "min_photos_per_product": 3,
        "max_photos_per_product": 5,
        "max_companies_allowed": 50,
        "price": "0.00",
        "is_free": False,
        "is_active": True,
        "base_weight": 7,
        "hero_eligible": True,
        "premium_floor_share": "10.00",
        "cooldown_hours": 24,
        "display_priority": 30,
        "visibility_type": "pro",
    },
    {
        "name": "Prime Elite",
        "slug": "prime-elite",
        "description": "Mid-volume pro listing for focused product portfolios.",
        "max_products": 7,
        "min_photos_per_product": 3,
        "max_photos_per_product": 5,
        "max_companies_allowed": 75,
        "price": "0.00",
        "is_free": False,
        "is_active": True,
        "base_weight": 5,
        "hero_eligible": False,
        "premium_floor_share": "7.00",
        "cooldown_hours": 18,
        "display_priority": 40,
        "visibility_type": "pro",
    },
    {
        "name": "Prime Circle",
        "slug": "prime-circle",
        "description": "Standard market listing for active directory members.",
        "max_products": 3,
        "min_photos_per_product": 3,
        "max_photos_per_product": 5,
        "max_companies_allowed": 100,
        "price": "0.00",
        "is_free": False,
        "is_active": True,
        "base_weight": 3,
        "hero_eligible": False,
        "premium_floor_share": "5.00",
        "cooldown_hours": 12,
        "display_priority": 50,
        "visibility_type": "normal",
    },
    {
        "name": "Prime Unique",
        "slug": "prime-unique",
        "description": "Entry-level free listing with a single showcase product.",
        "max_products": 1,
        "min_photos_per_product": 3,
        "max_photos_per_product": 5,
        "max_companies_allowed": None,
        "price": "0.00",
        "is_free": True,
        "is_active": True,
        "base_weight": 1,
        "hero_eligible": False,
        "premium_floor_share": "3.00",
        "cooldown_hours": 12,
        "display_priority": 60,
        "visibility_type": "normal",
    },
]

ZONE_SPECS = [
    {
        "key": "hero_spotlight",
        "title": "Hero Spotlight",
        "description": "Primary high-visibility spotlight zone for marquee company placements.",
        "layout": "hero_company",
        "sort_order": 10,
        "capacity": 1,
        "is_enabled": True,
    },
    {
        "key": "featured_companies",
        "title": "Featured Companies",
        "description": "Premium company rail used for curated and weighted discovery.",
        "layout": "rail_company",
        "sort_order": 20,
        "capacity": 8,
        "is_enabled": True,
    },
    {
        "key": "rising_companies",
        "title": "Rising Companies",
        "description": "Discovery-focused company zone with balanced visibility for emerging listings.",
        "layout": "grid_company",
        "sort_order": 30,
        "capacity": 12,
        "is_enabled": True,
    },
    {
        "key": "latest_products",
        "title": "Latest Products",
        "description": "Product-oriented zone reserved for future product feed expansion.",
        "layout": "rail_product",
        "sort_order": 40,
        "capacity": 8,
        "is_enabled": True,
    },
]

ZONE_RULE_SPECS = {
    "hero_spotlight": {
        "prime-signature": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "1.00", "guaranteed_share": "20.00"},
        "prime-classic": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "0.90", "guaranteed_share": "15.00"},
        "prime-premier": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "0.75", "guaranteed_share": "10.00"},
        "prime-elite": {"is_eligible": True, "is_wildcard": True, "weight_multiplier": "0.55", "guaranteed_share": "7.00"},
        "prime-circle": {"is_eligible": True, "is_wildcard": True, "weight_multiplier": "0.35", "guaranteed_share": "5.00"},
        "prime-unique": {"is_eligible": True, "is_wildcard": True, "weight_multiplier": "0.20", "guaranteed_share": "3.00"},
    },
    "featured_companies": {
        "prime-signature": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "1.50", "guaranteed_share": "20.00"},
        "prime-classic": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "1.30", "guaranteed_share": "15.00"},
        "prime-premier": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "1.15", "guaranteed_share": "10.00"},
        "prime-elite": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "1.00", "guaranteed_share": "7.00"},
        "prime-circle": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "0.85", "guaranteed_share": "5.00"},
        "prime-unique": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "0.70", "guaranteed_share": "3.00"},
    },
    "rising_companies": {
        "prime-signature": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "1.10", "guaranteed_share": "12.00"},
        "prime-classic": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "1.05", "guaranteed_share": "12.00"},
        "prime-premier": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "1.00", "guaranteed_share": "12.00"},
        "prime-elite": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "0.95", "guaranteed_share": "12.00"},
        "prime-circle": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "0.90", "guaranteed_share": "12.00"},
        "prime-unique": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "0.85", "guaranteed_share": "12.00"},
    },
    "latest_products": {
        "prime-signature": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "1.00", "guaranteed_share": "0.00"},
        "prime-classic": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "1.00", "guaranteed_share": "0.00"},
        "prime-premier": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "1.00", "guaranteed_share": "0.00"},
        "prime-elite": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "1.00", "guaranteed_share": "0.00"},
        "prime-circle": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "1.00", "guaranteed_share": "0.00"},
        "prime-unique": {"is_eligible": True, "is_wildcard": False, "weight_multiplier": "1.00", "guaranteed_share": "0.00"},
    },
}


def seed_market_visibility_foundation(apps, schema_editor):
    CompanyTier = apps.get_model("directory", "CompanyTier")
    MarketZone = apps.get_model("directory", "MarketZone")
    ZoneEligibilityRule = apps.get_model("directory", "ZoneEligibilityRule")

    tier_by_slug = {}
    for tier_spec in TIER_SPECS:
        tier, _ = CompanyTier.objects.update_or_create(
            slug=tier_spec["slug"],
            defaults=tier_spec,
        )
        tier_by_slug[tier_spec["slug"]] = tier

    zone_by_key = {}
    for zone_spec in ZONE_SPECS:
        zone, _ = MarketZone.objects.update_or_create(
            key=zone_spec["key"],
            defaults=zone_spec,
        )
        zone_by_key[zone_spec["key"]] = zone

    for zone_key, rules_by_tier in ZONE_RULE_SPECS.items():
        zone = zone_by_key[zone_key]
        for tier_slug, rule_spec in rules_by_tier.items():
            ZoneEligibilityRule.objects.update_or_create(
                zone=zone,
                tier=tier_by_slug[tier_slug],
                defaults=rule_spec,
            )


class Migration(migrations.Migration):

    dependencies = [
        ("directory", "0006_productwishlist"),
    ]

    operations = [
        migrations.AddField(
            model_name="company",
            name="is_market_visible",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="company",
            name="last_featured_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="companytier",
            name="base_weight",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="companytier",
            name="cooldown_hours",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="companytier",
            name="hero_eligible",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="companytier",
            name="premium_floor_share",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.CreateModel(
            name="MarketZone",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("key", models.SlugField(max_length=80, unique=True)),
                ("title", models.CharField(max_length=140)),
                ("description", models.TextField(blank=True)),
                (
                    "layout",
                    models.CharField(
                        choices=[
                            ("hero_company", "Hero Company"),
                            ("grid_company", "Grid Company"),
                            ("rail_company", "Rail Company"),
                            ("rail_product", "Rail Product"),
                        ],
                        default="rail_company",
                        max_length=40,
                    ),
                ),
                ("sort_order", models.PositiveIntegerField(default=0)),
                ("capacity", models.PositiveIntegerField(default=1)),
                ("is_enabled", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["sort_order", "id"]},
        ),
        migrations.CreateModel(
            name="ExposureLedger",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event_type", models.CharField(choices=[("served", "Served")], default="served", max_length=30)),
                ("served_at", models.DateTimeField()),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="exposure_events", to="directory.company")),
                ("tier", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="exposure_events", to="directory.companytier")),
                ("zone", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="exposure_events", to="directory.marketzone")),
            ],
            options={"ordering": ["-served_at", "-id"]},
        ),
        migrations.CreateModel(
            name="PlacementOverride",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(choices=[("pin", "Pin"), ("boost", "Boost"), ("block", "Block")], max_length=20)),
                ("starts_at", models.DateTimeField()),
                ("ends_at", models.DateTimeField()),
                ("priority", models.PositiveIntegerField(default=0)),
                ("notes", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="placement_overrides", to="directory.company")),
                ("zone", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="placement_overrides", to="directory.marketzone")),
            ],
            options={"ordering": ["-priority", "starts_at", "id"]},
        ),
        migrations.CreateModel(
            name="ZoneEligibilityRule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("is_eligible", models.BooleanField(default=True)),
                ("is_wildcard", models.BooleanField(default=False)),
                ("weight_multiplier", models.DecimalField(decimal_places=2, default=1, max_digits=6)),
                ("guaranteed_share", models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ("tier", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="zone_eligibility_rules", to="directory.companytier")),
                ("zone", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="eligibility_rules", to="directory.marketzone")),
            ],
            options={"ordering": ["zone__sort_order", "tier__display_priority", "id"]},
        ),
        migrations.AddConstraint(
            model_name="zoneeligibilityrule",
            constraint=models.UniqueConstraint(fields=("zone", "tier"), name="uniq_zone_tier_eligibility_rule"),
        ),
        migrations.RunPython(seed_market_visibility_foundation, migrations.RunPython.noop),
    ]
