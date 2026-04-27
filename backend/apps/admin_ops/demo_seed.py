from __future__ import annotations

from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import AdminScopeAssignment, MemberProfile, NotificationPreference
from apps.ads.models import AdApproval, AdAsset, AdTargeting, Advertisement
from apps.directory.models import (
    Company,
    CompanyImage,
    CompanyVerification,
    MediaAsset,
    Product,
    ProductCategory,
    ProductImage,
)
from apps.news.models import Alert, MeetingEvent, NewsItem
from apps.rates.models import AssociationRate, ExternalMarketRate, GlobalTrendSnapshot
from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit
from apps.reverse_search.models import ReverseSearchAttachment, ReverseSearchRequest, ReverseSearchResponse
from apps.services_app.models import ComplianceReminder, ComplianceRequest, ServiceType

from .models import AuditLog

DEMO_PASSWORD = "DemoPass123!"
DEMO_USERNAMES = [
    "demo_super_admin",
    "demo_admin",
    "demo_association_admin",
    "demo_district_admin",
    "demo_unit_admin",
    "demo_member",
    "demo_supplier",
    "demo_advertiser",
]


def _aware_datetime(year: int, month: int, day: int, hour: int = 9, minute: int = 0) -> datetime:
    return timezone.make_aware(datetime(year, month, day, hour, minute))


def _upsert(model, lookup: dict, defaults: dict):
    instance = model.objects.filter(**lookup).order_by("id").first()
    if instance is None:
        return model.objects.create(**lookup, **defaults)

    updated_fields: list[str] = []
    for field_name, value in defaults.items():
        if getattr(instance, field_name) != value:
            setattr(instance, field_name, value)
            updated_fields.append(field_name)

    if updated_fields:
        instance.save(update_fields=updated_fields)
    return instance


def _seed_media_asset(*, object_key: str, uploader, bucket_name: str, filename: str, visibility: str, moderation_status: str) -> MediaAsset:
    return _upsert(
        MediaAsset,
        {"object_key": object_key},
        {
            "uploader": uploader,
            "bucket_name": bucket_name,
            "original_filename": filename,
            "mime_type": "image/jpeg",
            "width": 1200,
            "height": 1200,
            "file_size": 245760,
            "visibility": visibility,
            "moderation_status": moderation_status,
            "alt_text": filename.replace(".jpg", "").replace("-", " ").title(),
            "caption": "Demo media asset",
            "sort_order": 0,
        },
    )


def reset_demo_data() -> None:
    user_model = get_user_model()

    ReverseSearchAttachment.objects.all().delete()
    ReverseSearchResponse.objects.all().delete()
    ReverseSearchRequest.objects.all().delete()
    AdApproval.objects.all().delete()
    AdAsset.objects.all().delete()
    AdTargeting.objects.all().delete()
    Advertisement.objects.all().delete()
    CompanyImage.objects.all().delete()
    ProductImage.objects.all().delete()
    MediaAsset.objects.all().delete()
    Product.objects.all().delete()
    ProductCategory.objects.all().delete()
    CompanyVerification.objects.all().delete()
    Company.objects.all().delete()
    ComplianceRequest.objects.all().delete()
    ComplianceReminder.objects.all().delete()
    ServiceType.objects.all().delete()
    MeetingEvent.objects.all().delete()
    Alert.objects.all().delete()
    NewsItem.objects.all().delete()
    GlobalTrendSnapshot.objects.all().delete()
    ExternalMarketRate.objects.all().delete()
    AssociationRate.objects.all().delete()
    AuditLog.objects.all().delete()
    AdminScopeAssignment.objects.all().delete()
    Unit.objects.all().delete()
    DistrictOperationalUnit.objects.all().delete()
    Association.objects.all().delete()
    RegionState.objects.all().delete()
    user_model.objects.filter(username__in=DEMO_USERNAMES).delete()


def seed_demo_data(reset: bool = False) -> dict[str, object]:
    with transaction.atomic():
        if reset:
            reset_demo_data()

        hierarchy = _seed_regions()
        users = _seed_users(hierarchy)
        _seed_directory(users)
        _seed_rates()
        _seed_services()
        _seed_news()
        _seed_ads(users, hierarchy)
        _seed_reverse_search(users)
        _seed_audit_logs(users, hierarchy)

    return users


def _seed_users(hierarchy: dict[str, dict[str, object]]) -> dict[str, object]:
    user_model = get_user_model()

    user_specs = [
        {
            "key": "super_admin",
            "lookup": {"username": "demo_super_admin"},
            "defaults": {
                "email": "super-admin@demo-jewellery.app",
                "first_name": "Super",
                "last_name": "Admin",
                "role": user_model.Role.SUPER_ADMIN,
                "is_staff": True,
                "is_verified_member": True,
                "onboarding_completed": True,
            },
        },
        {
            "key": "admin",
            "lookup": {"username": "demo_admin"},
            "defaults": {
                "email": "admin@demo-jewellery.app",
                "first_name": "Admin",
                "last_name": "Desk",
                "role": user_model.Role.ADMIN,
                "is_staff": True,
                "is_verified_member": True,
                "onboarding_completed": True,
            },
        },
        {
            "key": "association_admin",
            "lookup": {"username": "demo_association_admin"},
            "defaults": {
                "email": "association-admin@demo-jewellery.app",
                "first_name": "Maya",
                "last_name": "Nair",
                "role": user_model.Role.ADMIN,
                "is_verified_member": True,
                "onboarding_completed": True,
            },
        },
        {
            "key": "district_admin",
            "lookup": {"username": "demo_district_admin"},
            "defaults": {
                "email": "district-admin@demo-jewellery.app",
                "first_name": "Vikram",
                "last_name": "Iyer",
                "role": user_model.Role.ADMIN,
                "is_verified_member": True,
                "onboarding_completed": True,
            },
        },
        {
            "key": "unit_admin",
            "lookup": {"username": "demo_unit_admin"},
            "defaults": {
                "email": "unit-admin@demo-jewellery.app",
                "first_name": "Nisha",
                "last_name": "Pillai",
                "role": user_model.Role.ADMIN,
                "is_verified_member": True,
                "onboarding_completed": True,
            },
        },
        {
            "key": "member",
            "lookup": {"username": "demo_member"},
            "defaults": {
                "email": "member@demo-jewellery.app",
                "corporate_email": "member@heritagegold.example",
                "first_name": "Anika",
                "last_name": "Menon",
                "role": user_model.Role.MEMBER,
                "jeweller_id": "JWL-DEMO-1001",
                "is_verified_member": True,
                "onboarding_completed": True,
            },
        },
        {
            "key": "supplier",
            "lookup": {"username": "demo_supplier"},
            "defaults": {
                "email": "supplier@demo-jewellery.app",
                "first_name": "Rohit",
                "last_name": "Varma",
                "role": user_model.Role.SUPPLIER,
                "is_verified_member": True,
                "onboarding_completed": True,
            },
        },
        {
            "key": "advertiser",
            "lookup": {"username": "demo_advertiser"},
            "defaults": {
                "email": "advertiser@demo-jewellery.app",
                "first_name": "Leena",
                "last_name": "Joseph",
                "role": user_model.Role.ADVERTISER,
                "is_verified_member": True,
                "onboarding_completed": True,
            },
        },
    ]

    users: dict[str, object] = {}
    for spec in user_specs:
        user = _upsert(user_model, spec["lookup"], spec["defaults"])
        user.set_password(DEMO_PASSWORD)
        user.save(update_fields=["password"])
        users[spec["key"]] = user

    member = users["member"]
    kerala = hierarchy["states"]["Kerala"]
    kgsma = hierarchy["associations"]["KGSMA"]
    ernakulam_district_unit = hierarchy["district_units"]["Ernakulam District Unit"]
    kadavanthra_unit = hierarchy["units"]["Kadavanthra Unit"]
    _upsert(
        MemberProfile,
        {"user": member},
        {
            "phone_number": "9876543210",
            "company_name": "Heritage Gold House",
            "state": kerala,
            "association": kgsma,
            "district_operational_unit": ernakulam_district_unit,
            "unit": kadavanthra_unit,
            "membership_tier": "Platinum",
        },
    )
    _upsert(
        NotificationPreference,
        {"user": member},
        {
            "rate_alerts": True,
            "news_alerts": True,
            "ad_alerts": False,
            "meeting_alerts": True,
        },
    )
    _upsert(
        NotificationPreference,
        {"user": users["super_admin"]},
        {
            "rate_alerts": True,
            "news_alerts": True,
            "ad_alerts": True,
            "meeting_alerts": True,
        },
    )
    _upsert(
        NotificationPreference,
        {"user": users["admin"]},
        {
            "rate_alerts": True,
            "news_alerts": True,
            "ad_alerts": True,
            "meeting_alerts": True,
        },
    )
    _upsert(
        AdminScopeAssignment,
        {"user": users["association_admin"]},
        {
            "association": kgsma,
            "district_operational_unit": None,
            "unit": None,
        },
    )
    _upsert(
        AdminScopeAssignment,
        {"user": users["district_admin"]},
        {
            "association": None,
            "district_operational_unit": ernakulam_district_unit,
            "unit": None,
        },
    )
    _upsert(
        AdminScopeAssignment,
        {"user": users["unit_admin"]},
        {
            "association": None,
            "district_operational_unit": None,
            "unit": kadavanthra_unit,
        },
    )

    return users


def _seed_regions() -> dict[str, dict[str, object]]:
    hierarchy_spec = {
        "Kerala": {
            "KGSMA": {
                "Ernakulam District Unit": ["Kadavanthra Unit", "Aluva Unit"],
                "Thrissur District Unit": ["Round North Unit", "Kodungallur Unit"],
            },
            "AKGSMA": {
                "Kozhikode District Unit": ["SM Street Unit", "Nadakkavu Unit"],
            },
        },
        "Tamil Nadu": {
            "Tamil Nadu Jewellers Association": {
                "Chennai District Unit": ["T Nagar Unit", "Anna Salai Unit"],
                "Coimbatore District Unit": ["RS Puram Unit", "Gandhipuram Unit"],
            },
        },
        "Karnataka": {
            "Karnataka Gold Traders Association": {
                "Bengaluru Urban District Unit": ["Chickpet Unit", "Jayanagar Unit"],
                "Mysuru District Unit": ["Devaraja Unit", "VV Mohalla Unit"],
            },
        },
    }

    hierarchy = {"states": {}, "associations": {}, "district_units": {}, "units": {}}

    for state_name, associations in hierarchy_spec.items():
        state = _upsert(RegionState, {"name": state_name}, {})
        hierarchy["states"][state_name] = state
        for association_name, district_units in associations.items():
            association = _upsert(Association, {"state": state, "name": association_name}, {})
            hierarchy["associations"][association_name] = association
            for district_unit_name, units in district_units.items():
                district_unit = _upsert(
                    DistrictOperationalUnit,
                    {"association": association, "name": district_unit_name},
                    {},
                )
                hierarchy["district_units"][district_unit_name] = district_unit
                for unit_name in units:
                    unit = _upsert(
                        Unit,
                        {"district_operational_unit": district_unit, "name": unit_name},
                        {},
                    )
                    hierarchy["units"][unit_name] = unit

    return hierarchy


def _seed_directory(users: dict[str, object]) -> None:
    categories = {
        "Temple Jewellery": ProductCategory.objects.filter(name="Temple Jewellery").first()
        or ProductCategory.objects.create(name="Temple Jewellery"),
        "Bridal Sets": ProductCategory.objects.filter(name="Bridal Sets").first() or ProductCategory.objects.create(name="Bridal Sets"),
        "Lightweight Chains": ProductCategory.objects.filter(name="Lightweight Chains").first()
        or ProductCategory.objects.create(name="Lightweight Chains"),
        "Diamond Rings": ProductCategory.objects.filter(name="Diamond Rings").first() or ProductCategory.objects.create(name="Diamond Rings"),
    }

    companies = [
        {
            "name": "Heritage Gold House",
            "category": "Wholesale",
            "tier": Company.Tier.PREMIUM,
            "city": "Thrissur",
            "state": "Kerala",
            "about": "High-volume manufacturing for regional retailers and premium bridal houses.",
            "daily_capacity": "15kg",
            "specialization": "Temple jewellery",
            "verification": {"gst_registered": True, "bis_hallmarked": True, "export_licensed": False},
            "products": [
                ("Temple Jewellery", "Lakshmi Kasu Mala", "48.50", "22K", "Hand-finished temple necklace."),
                ("Bridal Sets", "Bridal Mango Haram", "62.00", "22K", "Layered mango-motif bridal haram."),
            ],
        },
        {
            "name": "Coastal Bullion Works",
            "category": "Manufacturer",
            "tier": Company.Tier.PRO,
            "city": "Kochi",
            "state": "Kerala",
            "about": "Casting and finishing line focused on fast-moving daily wear collections.",
            "daily_capacity": "9kg",
            "specialization": "Lightweight chains",
            "verification": {"gst_registered": True, "bis_hallmarked": True, "export_licensed": True},
            "products": [
                ("Lightweight Chains", "Singapore Twist Chain", "14.25", "22K", "Daily wear Singapore twist chain."),
            ],
        },
        {
            "name": "Metro Diamond Studio",
            "category": "Retail",
            "tier": Company.Tier.PREMIUM,
            "city": "Chennai",
            "state": "Tamil Nadu",
            "about": "Premium retail showroom with bridal consultations and custom diamond work.",
            "daily_capacity": "4kg",
            "specialization": "Diamond rings",
            "verification": {"gst_registered": True, "bis_hallmarked": True, "export_licensed": False},
            "products": [
                ("Diamond Rings", "Solitaire Halo Ring", "6.40", "18K", "Halo-set solitaire ring for bridal collections."),
            ],
        },
        {
            "name": "Kaveri Ornament Hub",
            "category": "Wholesale",
            "tier": Company.Tier.NORMAL,
            "city": "Coimbatore",
            "state": "Tamil Nadu",
            "about": "Regional wholesaler with fast replenishment for family jewellers.",
            "daily_capacity": "6kg",
            "specialization": "Bridal sets",
            "verification": {"gst_registered": True, "bis_hallmarked": False, "export_licensed": False},
            "products": [
                ("Bridal Sets", "Floral Bridal Choker", "38.00", "22K", "Floral bridal choker with matching studs."),
            ],
        },
        {
            "name": "Chickpet Classic Chains",
            "category": "Manufacturer",
            "tier": Company.Tier.PRO,
            "city": "Bengaluru",
            "state": "Karnataka",
            "about": "Bulk chain producer with strong daily wear assortments.",
            "daily_capacity": "11kg",
            "specialization": "Machine chains",
            "verification": {"gst_registered": True, "bis_hallmarked": True, "export_licensed": False},
            "products": [
                ("Lightweight Chains", "Box Link Chain", "10.10", "22K", "Popular box-link chain for urban storefronts."),
            ],
        },
        {
            "name": "Mysuru Heritage Crafts",
            "category": "Retail",
            "tier": Company.Tier.NORMAL,
            "city": "Mysuru",
            "state": "Karnataka",
            "about": "Traditional handcrafted pieces for festive and temple collections.",
            "daily_capacity": "3kg",
            "specialization": "Antique finish work",
            "verification": {"gst_registered": True, "bis_hallmarked": True, "export_licensed": False},
            "products": [
                ("Temple Jewellery", "Antique Vanki", "24.75", "22K", "Armlet with antique temple detailing."),
            ],
        },
    ]

    for company_spec in companies:
        company = _upsert(
            Company,
            {"name": company_spec["name"]},
            {
                "category": company_spec["category"],
                "tier": company_spec["tier"],
                "city": company_spec["city"],
                "state": company_spec["state"],
                "about": company_spec["about"],
                "daily_capacity": company_spec["daily_capacity"],
                "specialization": company_spec["specialization"],
            },
        )
        _upsert(CompanyVerification, {"company": company}, company_spec["verification"])

        for category_name, product_name, weight, purity, description in company_spec["products"]:
            category = categories[category_name]
            product = _upsert(
                Product,
                {"company": company, "name": product_name},
                {
                    "category": category,
                    "weight_grams": weight,
                    "purity": purity,
                    "description": description,
                },
            )
            product_asset = _seed_media_asset(
                object_key=f"products/{company.id}/{product.name.lower().replace(' ', '-')}.jpg",
                uploader=users["member"],
                bucket_name="demo-public-media",
                filename=f"{product.name.lower().replace(' ', '-')}.jpg",
                visibility=MediaAsset.Visibility.PUBLIC,
                moderation_status=MediaAsset.ModerationStatus.APPROVED,
            )
            _upsert(ProductImage, {"product": product}, {"asset": product_asset})

        company_asset = _seed_media_asset(
            object_key=f"companies/{company.id}/hero.jpg",
            uploader=users["member"],
            bucket_name="demo-public-media",
            filename=f"{company.name.lower().replace(' ', '-')}.jpg",
            visibility=MediaAsset.Visibility.PUBLIC,
            moderation_status=MediaAsset.ModerationStatus.APPROVED,
        )
        _upsert(CompanyImage, {"company": company}, {"asset": company_asset, "is_logo": False})


def _seed_rates() -> None:
    _upsert(
        AssociationRate,
        {"region_label": "Association Board Rate - Previous"},
        {
            "gold_22k": "6765.00",
            "gold_24k": "7395.00",
            "silver": "90.25",
            "effective_at": _aware_datetime(2026, 4, 20, 9, 0),
        },
    )
    _upsert(
        AssociationRate,
        {"region_label": "Association Board Rate - Latest"},
        {
            "gold_22k": "6785.00",
            "gold_24k": "7410.00",
            "silver": "89.40",
            "effective_at": _aware_datetime(2026, 4, 21, 9, 0),
        },
    )

    for source_name, region_label, gold_22k, gold_24k, silver, effective_at in [
        ("South Zone Association", "Kerala", "6778.00", "7402.00", "89.65", _aware_datetime(2026, 4, 21, 8, 45)),
        ("Metro Trade Board", "Tamil Nadu", "6792.00", "7418.00", "89.20", _aware_datetime(2026, 4, 21, 8, 30)),
        ("Bullion Watch", "Karnataka", "6769.00", "7398.00", "89.85", _aware_datetime(2026, 4, 21, 8, 15)),
    ]:
        _upsert(
            ExternalMarketRate,
            {"source_name": source_name, "region_label": region_label},
            {
                "gold_22k": gold_22k,
                "gold_24k": gold_24k,
                "silver": silver,
                "effective_at": effective_at,
            },
        )

    _upsert(
        GlobalTrendSnapshot,
        {"usd_inr": "83.22", "gold_oz": "2362.11", "silver_oz": "28.41"},
        {"captured_at": _aware_datetime(2026, 4, 21, 8, 0)},
    )


def _seed_services() -> None:
    service_types = [
        ("Calibration", 4, "98.6%"),
        ("Compliance Support", 5, ""),
        ("Diamond Certification", 3, ""),
        ("Hallmarking", 6, ""),
    ]
    service_map: dict[str, ServiceType] = {}
    for name, average_turnaround_days, accuracy_metric in service_types:
        service_map[name] = _upsert(
            ServiceType,
            {"name": name},
            {
                "average_turnaround_days": average_turnaround_days,
                "accuracy_metric": accuracy_metric,
            },
        )

    for service_name, business_name, due_in_days, status in [
        ("Calibration", "Heritage Gold House", 5, "action_required"),
        ("Compliance Support", "Metro Diamond Studio", 0, "action_required"),
        ("Hallmarking", "Coastal Bullion Works", 2, "in_review"),
    ]:
        _upsert(
            ComplianceRequest,
            {"service_type": service_map[service_name], "business_name": business_name},
            {
                "due_in_days": due_in_days,
                "status": status,
            },
        )

    for title, due_in_days, severity in [
        ("License Renewal", 0, "action_required"),
        ("GST Filing Check", 3, "attention"),
    ]:
        _upsert(
            ComplianceReminder,
            {"title": title},
            {
                "due_in_days": due_in_days,
                "severity": severity,
            },
        )


def _seed_news() -> None:
    now = timezone.now().replace(microsecond=0, second=0)

    _upsert(
        Alert,
        {"title": "GST update issued for bullion traders"},
        {
            "body": "Updated tax guidance is now available for member businesses.",
            "severity": "urgent",
            "active": True,
        },
    )
    _upsert(
        NewsItem,
        {"title": "Association onboarding camp expands to new districts"},
        {
            "summary": "Regional outreach and member support counters are opening across more association district units this month.",
            "is_urgent": False,
        },
    )

    for title, venue, days_ahead, calendar_url in [
        ("Association Trade Meet", "Thrissur Trade Hall", 2, "https://calendar.google.com"),
        ("Bullion Compliance Workshop", "Kochi Convention Centre", 5, "https://calendar.google.com"),
        ("Retail Growth Forum", "Chennai Business Centre", 9, "https://calendar.google.com"),
    ]:
        _upsert(
            MeetingEvent,
            {"title": title},
            {
                "venue": venue,
                "starts_at": now + timedelta(days=days_ahead),
                "calendar_url": calendar_url,
            },
        )


def _seed_ads(users: dict[str, object], hierarchy: dict[str, dict[str, object]]) -> None:
    advertisement = _upsert(
        Advertisement,
        {"advertiser": users["advertiser"], "title": "Akshaya Tritiya Launch Banner"},
        {
            "reach": "state",
            "status": "approved",
            "starts_at": timezone.localdate(),
            "ends_at": timezone.localdate() + timedelta(days=14),
        },
    )
    _upsert(
        AdTargeting,
        {"advertisement": advertisement},
        {
            "state": hierarchy["states"]["Kerala"],
            "association": hierarchy["associations"]["KGSMA"],
            "district_operational_unit": hierarchy["district_units"]["Ernakulam District Unit"],
            "unit": hierarchy["units"]["Kadavanthra Unit"],
        },
    )
    ad_asset = _seed_media_asset(
        object_key=f"ads/{users['advertiser'].id}/akshaya-tritiya-launch-banner.jpg",
        uploader=users["advertiser"],
        bucket_name="demo-private-media",
        filename="akshaya-tritiya-launch-banner.jpg",
        visibility=MediaAsset.Visibility.PRIVATE,
        moderation_status=MediaAsset.ModerationStatus.APPROVED,
    )
    _upsert(
        AdAsset,
        {"advertisement": advertisement},
        {
            "asset": ad_asset,
            "placement": "dashboard_hero",
        },
    )
    _upsert(
        AdApproval,
        {"advertisement": advertisement},
        {
            "approved_by": users["admin"],
            "notes": "Creative approved for premium dashboard placement.",
            "approved_at": timezone.now(),
        },
    )


def _seed_reverse_search(users: dict[str, object]) -> None:
    request = _upsert(
        ReverseSearchRequest,
        {"created_by": users["member"], "notes": "Need a supplier match for an antique bridal bangle with peacock detailing."},
        {
            "status": ReverseSearchRequest.Status.SUPPLIER_RESPONDED,
        },
    )
    attachment_asset = _seed_media_asset(
        object_key=f"reverse-search/{users['member'].id}/bridal-bangle-reference.jpg",
        uploader=users["member"],
        bucket_name="demo-private-media",
        filename="bridal-bangle-reference.jpg",
        visibility=MediaAsset.Visibility.PRIVATE,
        moderation_status=MediaAsset.ModerationStatus.PENDING,
    )
    _upsert(
        ReverseSearchAttachment,
        {"request": request},
        {
            "asset": attachment_asset,
        },
    )
    _upsert(
        ReverseSearchResponse,
        {"request": request, "message": "Supplier can reproduce the design in 8 working days."},
        {
            "responder": users["supplier"],
            "availability_label": "Available",
        },
    )


def _seed_audit_logs(users: dict[str, object], hierarchy: dict[str, dict[str, object]]) -> None:
    for action, entity_type, entity_id, metadata in [
        (
            "member_verified",
            "user",
            "demo_member",
            {
                "actor_role": "admin",
                "state": hierarchy["states"]["Kerala"].name,
                "association": hierarchy["associations"]["KGSMA"].name,
                "district_unit": hierarchy["district_units"]["Ernakulam District Unit"].name,
                "unit": hierarchy["units"]["Kadavanthra Unit"].name,
            },
        ),
        ("rate_updated", "association_rate", "board-rate-latest", {"region": "Association Board Rate - Latest"}),
        ("ad_approved", "advertisement", "akshaya-tritiya-launch-banner", {"placement": "dashboard_hero"}),
    ]:
        _upsert(
            AuditLog,
            {"action": action, "entity_type": entity_type, "entity_id": entity_id},
            {
                "actor": users["admin"],
                "metadata": metadata,
            },
        )
