from __future__ import annotations

from datetime import datetime, timedelta
from urllib.parse import quote_plus

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import AdminScopeAssignment, MemberProfile, NotificationPreference, UserRole
from apps.ads.models import AdApproval, AdAsset, AdClick, AdImpression, AdTargeting, Advertisement
from apps.directory.models import (
    Company,
    CompanyImage,
    CompanyTier,
    CompanyVerification,
    MediaAsset,
    Product,
    ProductCategory,
    ProductImage,
)
from apps.news.models import Alert, Meeting, MeetingEvent, MeetingResponse, MeetingTarget, News, NewsItem, NewsTarget
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
    "demo_kgsma_admin",
    "demo_akgsma_admin",
    "demo_tnja_admin",
    "demo_kgta_admin",
    "demo_member",
    "demo_akgsma_member",
    "demo_tnja_member",
    "demo_kgta_member",
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


def _seed_media_asset(
    *,
    object_key: str,
    uploader,
    bucket_name: str,
    filename: str,
    visibility: str,
    moderation_status: str,
    public_url: str = "",
) -> MediaAsset:
    return _upsert(
        MediaAsset,
        {"object_key": object_key},
        {
            "uploader": uploader,
            "bucket_name": bucket_name,
            "original_filename": filename,
            "mime_type": "image/jpeg",
            "public_url": public_url,
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


def _build_logo_url(company_name: str) -> str:
    return f"https://placehold.co/256x256/FFFFFF/1C1B1B?text={quote_plus(company_name)}"


def reset_demo_data() -> None:
    user_model = get_user_model()

    ReverseSearchAttachment.objects.all().delete()
    ReverseSearchResponse.objects.all().delete()
    ReverseSearchRequest.objects.all().delete()
    AdClick.objects.all().delete()
    AdImpression.objects.all().delete()
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
    MeetingResponse.objects.all().delete()
    MeetingTarget.objects.all().delete()
    Meeting.objects.all().delete()
    MeetingEvent.objects.all().delete()
    NewsTarget.objects.all().delete()
    News.objects.all().delete()
    Alert.objects.all().delete()
    NewsItem.objects.all().delete()
    GlobalTrendSnapshot.objects.all().delete()
    ExternalMarketRate.objects.all().delete()
    AssociationRate.objects.all().delete()
    AuditLog.objects.all().delete()
    AdminScopeAssignment.objects.all().delete()
    UserRole.objects.all().delete()
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
            "key": "kgsma_admin",
            "lookup": {"username": "demo_kgsma_admin"},
            "defaults": {
                "email": "kgsma-admin@demo-jewellery.app",
                "first_name": "Kiran",
                "last_name": "George",
                "role": user_model.Role.ADMIN,
                "is_verified_member": True,
                "onboarding_completed": True,
            },
        },
        {
            "key": "akgsma_admin",
            "lookup": {"username": "demo_akgsma_admin"},
            "defaults": {
                "email": "akgsma-admin@demo-jewellery.app",
                "first_name": "Aparna",
                "last_name": "Das",
                "role": user_model.Role.ADMIN,
                "is_verified_member": True,
                "onboarding_completed": True,
            },
        },
        {
            "key": "akgsma_member",
            "lookup": {"username": "demo_akgsma_member"},
            "defaults": {
                "email": "akgsma-member@demo-jewellery.app",
                "corporate_email": "member@malabargoldline.example",
                "first_name": "Rahul",
                "last_name": "Nambiar",
                "role": user_model.Role.MEMBER,
                "jeweller_id": "JWL-DEMO-2001",
                "is_verified_member": True,
                "onboarding_completed": True,
            },
        },
        {
            "key": "tnja_admin",
            "lookup": {"username": "demo_tnja_admin"},
            "defaults": {
                "email": "tnja-admin@demo-jewellery.app",
                "first_name": "Sanjay",
                "last_name": "Raman",
                "role": user_model.Role.ADMIN,
                "is_verified_member": True,
                "onboarding_completed": True,
            },
        },
        {
            "key": "kgta_admin",
            "lookup": {"username": "demo_kgta_admin"},
            "defaults": {
                "email": "kgta-admin@demo-jewellery.app",
                "first_name": "Meera",
                "last_name": "Shetty",
                "role": user_model.Role.ADMIN,
                "is_verified_member": True,
                "onboarding_completed": True,
            },
        },
        {
            "key": "tnja_member",
            "lookup": {"username": "demo_tnja_member"},
            "defaults": {
                "email": "tnja-member@demo-jewellery.app",
                "corporate_email": "member@chennaitrade.example",
                "first_name": "Priya",
                "last_name": "Sundar",
                "role": user_model.Role.MEMBER,
                "jeweller_id": "JWL-DEMO-3001",
                "is_verified_member": True,
                "onboarding_completed": True,
            },
        },
        {
            "key": "kgta_member",
            "lookup": {"username": "demo_kgta_member"},
            "defaults": {
                "email": "kgta-member@demo-jewellery.app",
                "corporate_email": "member@bengalurubullion.example",
                "first_name": "Aditya",
                "last_name": "Rao",
                "role": user_model.Role.MEMBER,
                "jeweller_id": "JWL-DEMO-4001",
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
    tamil_nadu = hierarchy["states"]["Tamil Nadu"]
    karnataka = hierarchy["states"]["Karnataka"]
    kgsma = hierarchy["associations"]["KGSMA"]
    akgsma = hierarchy["associations"]["AKGSMA"]
    tnja = hierarchy["associations"]["Tamil Nadu Jewellers Association"]
    kgta = hierarchy["associations"]["Karnataka Gold Traders Association"]
    ernakulam_district_unit = hierarchy["district_units"]["Ernakulam District Unit"]
    kadavanthra_unit = hierarchy["units"]["Kadavanthra Unit"]
    kozhikode_district_unit = hierarchy["district_units"]["Kozhikode District Unit"]
    nadakkavu_unit = hierarchy["units"]["Nadakkavu Unit"]
    chennai_district_unit = hierarchy["district_units"]["Chennai District Unit"]
    t_nagar_unit = hierarchy["units"]["T Nagar Unit"]
    bengaluru_urban_district_unit = hierarchy["district_units"]["Bengaluru Urban District Unit"]
    chickpet_unit = hierarchy["units"]["Chickpet Unit"]
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
        MemberProfile,
        {"user": users["akgsma_member"]},
        {
            "phone_number": "9876501234",
            "company_name": "Malabar Goldline",
            "state": kerala,
            "association": akgsma,
            "district_operational_unit": kozhikode_district_unit,
            "unit": nadakkavu_unit,
            "membership_tier": "Gold",
        },
    )
    _upsert(
        MemberProfile,
        {"user": users["tnja_member"]},
        {
            "phone_number": "9876512345",
            "company_name": "Chennai Crown Jewels",
            "state": tamil_nadu,
            "association": tnja,
            "district_operational_unit": chennai_district_unit,
            "unit": t_nagar_unit,
            "membership_tier": "Gold",
        },
    )
    _upsert(
        MemberProfile,
        {"user": users["kgta_member"]},
        {
            "phone_number": "9876523456",
            "company_name": "Bengaluru Bullion House",
            "state": karnataka,
            "association": kgta,
            "district_operational_unit": bengaluru_urban_district_unit,
            "unit": chickpet_unit,
            "membership_tier": "Silver",
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
        {"user": users["akgsma_member"]},
        {
            "rate_alerts": True,
            "news_alerts": True,
            "ad_alerts": False,
            "meeting_alerts": True,
        },
    )
    _upsert(
        NotificationPreference,
        {"user": users["tnja_member"]},
        {
            "rate_alerts": True,
            "news_alerts": True,
            "ad_alerts": False,
            "meeting_alerts": True,
        },
    )
    _upsert(
        NotificationPreference,
        {"user": users["kgta_member"]},
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
        UserRole,
        {"user": users["super_admin"], "role": UserRole.Role.SUPER_ADMIN},
        {
            "scope_type": UserRole.ScopeType.PLATFORM,
            "scope_id": None,
        },
    )
    _upsert(
        UserRole,
        {"user": users["kgsma_admin"], "role": UserRole.Role.ASSOCIATION_ADMIN},
        {
            "scope_type": UserRole.ScopeType.ASSOCIATION,
            "scope_id": kgsma.id,
        },
    )
    _upsert(
        UserRole,
        {"user": users["akgsma_admin"], "role": UserRole.Role.ASSOCIATION_ADMIN},
        {
            "scope_type": UserRole.ScopeType.ASSOCIATION,
            "scope_id": akgsma.id,
        },
    )
    _upsert(
        UserRole,
        {"user": users["tnja_admin"], "role": UserRole.Role.ASSOCIATION_ADMIN},
        {
            "scope_type": UserRole.ScopeType.ASSOCIATION,
            "scope_id": tnja.id,
        },
    )
    _upsert(
        UserRole,
        {"user": users["kgta_admin"], "role": UserRole.Role.ASSOCIATION_ADMIN},
        {
            "scope_type": UserRole.ScopeType.ASSOCIATION,
            "scope_id": kgta.id,
        },
    )
    _upsert(
        UserRole,
        {"user": users["association_admin"], "role": UserRole.Role.ASSOCIATION_ADMIN},
        {
            "scope_type": UserRole.ScopeType.ASSOCIATION,
            "scope_id": kgsma.id,
        },
    )
    _upsert(
        UserRole,
        {"user": users["district_admin"], "role": UserRole.Role.DISTRICT_ADMIN},
        {
            "scope_type": UserRole.ScopeType.DISTRICT_OPERATIONAL_UNIT,
            "scope_id": ernakulam_district_unit.id,
        },
    )
    _upsert(
        UserRole,
        {"user": users["unit_admin"], "role": UserRole.Role.UNIT_ADMIN},
        {
            "scope_type": UserRole.ScopeType.UNIT,
            "scope_id": kadavanthra_unit.id,
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
    tier_by_slug = {
        tier.slug: tier
        for tier in CompanyTier.objects.filter(
            slug__in=[
                "prime-signature",
                "prime-classic",
                "prime-premier",
                "prime-elite",
                "prime-circle",
                "prime-unique",
            ]
        )
    }
    categories = {
        "Rings": ProductCategory.objects.filter(name="Rings").first() or ProductCategory.objects.create(name="Rings"),
        "Chains": ProductCategory.objects.filter(name="Chains").first() or ProductCategory.objects.create(name="Chains"),
        "Bangles": ProductCategory.objects.filter(name="Bangles").first() or ProductCategory.objects.create(name="Bangles"),
        "Necklaces": ProductCategory.objects.filter(name="Necklaces").first() or ProductCategory.objects.create(name="Necklaces"),
        "Coins": ProductCategory.objects.filter(name="Coins").first() or ProductCategory.objects.create(name="Coins"),
        "Diamonds": ProductCategory.objects.filter(name="Diamonds").first() or ProductCategory.objects.create(name="Diamonds"),
    }

    hero_images = {
        "showroom": "https://lh3.googleusercontent.com/aida-public/AB6AXuBhKhZ6QWTOhfsnu7EONIw7ioQpcrbrF3dDFycVfnRkB8q-dkt9aFkfVW9PayZdi61IuQYMo1mFG_zih9iXsnei_5YbFMT9gqF97pZkB0pbAMYthV9A0S5CGdpbWuHMpryUV5U_WbjrMpTV1ovHm56lQj2gyvu8uo_c_YShipov5d3-0JSz7RCkhz-l0vznMvJl70a1rrXsR9rIouU4ixcVhQHJgr-WE_wE-2_sUXoubojfQOOZZ4X8kC0JD7GWXRisUmgxiUaLKI",
        "diamond": "https://lh3.googleusercontent.com/aida-public/AB6AXuBHtNqSY_sV8-pOYCGl2q8jwhWY94AqGaqF2iDSxiKVSVUEp7pviX9LZbY5bEznvhJl1V6DBKP3zXw9ka-iViiHdeohep7LEWAbAUDhFxODAM0_pDmSPBSwkl9VenlJim29m3pFjED_SIw_7I_h2PFCxRAgUPIFwCk81uJkBTP5pbuvl5X6HkqRH120_bJhmO_1xEOm-s7ZL76LgsT4o75bqOmZ1E7PBItam3_mNgnLEjtXlK3VABYkjpUMUup57EFzWUgPTVs5oE4",
        "bullion": "https://lh3.googleusercontent.com/aida-public/AB6AXuB1Crsl-lI-Oa_W1EeE7wGWQx71fnNIlH94SpDdZQDc8jImZO6M_QAWvFNoGPFILfQWEpN7pvPbAYn6dMPRm8q6o9LCbmFoU-C-jvgnkUrxkl4PfeSj7W2qyRrdYRFlVRfSoMsVoxgrsQ4VwgRGGkgajWl1q_f8009T5ls6OXwPoZ0Ol62ftUWSzQhqMjLStNKvkB4eQTvtvFd3E4XrCYfn992xEeE2X87gpBM8r9CAWCEInzSmulUtykkiEwJs_gyBeoZTuzBhSQM",
        "artisan": "https://lh3.googleusercontent.com/aida-public/AB6AXuCqdXPUc3pNXw4_d0Fl6H1Hnpa2hq-WKu0K_LERYofWcpYw-Li9k0B4cr9f8oZsBuvSWFc5k59yLhHBBYLmrnYUHAkSDnI3Qz-raj3mC5-yBSih6WK3z9t75RpYCAcUDbtx0luP2PRSQ8qDxJjEwfsMJQnF8BgQZy-emoDg5bct0aYNiZY86G4fQersFfT6Q_URza_fL--SfUBfi2rLUONZUxtPIXPDZwWwKBb9ULQ1sbaUUF6yNWOmvSNUWRGwO6yXF9tLfWCyjt4",
        "studio": "https://lh3.googleusercontent.com/aida-public/AB6AXuAAmqHCc_jowb2sJvm0f95zOyeHlo9pNMUQ-Sv0Ebq4xzAV1OHwEN_m6icf6tOpV48YqrgUXxuSULZkqvNb-lIg6r3z3ykwx63o-hVHq2cEMTlbUhKEZ9FdqmISpx_taMtlpFsLh6dpg0qOlYCJoCYAHSa4qFvWvshkUb1iZue5_HgbyTB5xelOI79VEX1vjKxvmUA1GEqg1TSO5X3KuBk2PXxY5feDKStKW_YExE0iwBQ1J0VkuIwVA1NxK9nQv6NGopfEJWC9S58",
        "warehouse": "https://lh3.googleusercontent.com/aida-public/AB6AXuA2vpKKRhToiBVjzTqh6SQgDeIMf3AcJ6Fd5MXb_wjKxrCIq8FymO2G2u96IS4WGrbSFq66dEeQP6MPXdYYM9GnaTnsYM5rVkBjCFgYJ6OfAEtVgwsrmjMyzMIaUU0pTTn-J73lrDt_3as-BYvukeUfprNlfM7SMYegICBZXkx71FliAGKaCgi4-kNwIAzbJVI66XPlDETGLW1G4OZJICJzn5Gje_hsZC0b9QFfxm593FH25A56SBsbbAKR-1wSXtL_NVJ284ro40E",
    }
    product_images = {
        "ring": "https://lh3.googleusercontent.com/aida-public/AB6AXuANt8p_GJVDNA4aZ14ixudXMJTwzuzNk3t7brf-VrGQ0ZdQxDUseJytgXpFqceT2rUOMuhv1VwtT_b7ufw7Cm6GtzT24ij5auYZb4qxi-YRTyww6FMIXIPzTtfnTe3d_nCQ8HX_FZwY92ZBvPjgYxH3Bz6PXq9p43QipByIiCz7L7utMh-lbgcOi7W4eQNgv-FOg2rULEbXtllTw7Dnj-4Jtjcxk7AsLnHR96T4WqGJgWnAGFbPM4LRedBtpJaObHbPzem19kjDN90",
        "diamond": "https://lh3.googleusercontent.com/aida-public/AB6AXuCiYaKWjmLGuN-o4f8RODBgknBEkEXWelqvhQ7rxTkNPa71WldiLKAK_57Uw8rVJ7u-K7IcMJCukigKR_yidqVuOcAKn-qQIWL-tyYrRAjYzzq8h4sdgdaNphB4ttwJqVGshg4ojzGpCv-nvSzz_dKTwD4AZ5sfwu6bLTHuZdTzkhn58PEXlJ9_56_GhVdpvpMdE50hrEPvXnHkplEBbG1eUZUlINuD1llQ_hVcDMElVduW7BG72GgtX8fKFKaDIdck6uryxAMTUKY",
        "bangle": "https://lh3.googleusercontent.com/aida-public/AB6AXuA8fAYStmIyeNEeegaEu2AKcbzyKX6D5_A11AZ1VDgXMCFDIAoygODPcvBJvsAxz6tWyhozXQAaU5I3Tc2CcM3rHLkdXnJWa_mVUMwWVYqu6NtemuQWgAG_2AOsduAV8Eum7tdrqNPkm33iQiolWSAQWotNIO5slODNTjT1397GFjDhhOHUkq8ADjgAUYLp5npKQndIXdCPCm0XUnXDS3QGZL-8ZZgODF67rm9mmT0m8e9HfyQm3j28t7ovJWKOJtsO_VWPOvtBabM",
        "coin": "https://lh3.googleusercontent.com/aida-public/AB6AXuB1Crsl-lI-Oa_W1EeE7wGWQx71fnNIlH94SpDdZQDc8jImZO6M_QAWvFNoGPFILfQWEpN7pvPbAYn6dMPRm8q6o9LCbmFoU-C-jvgnkUrxkl4PfeSj7W2qyRrdYRFlVRfSoMsVoxgrsQ4VwgRGGkgajWl1q_f8009T5ls6OXwPoZ0Ol62ftUWSzQhqMjLStNKvkB4eQTvtvFd3E4XrCYfn992xEeE2X87gpBM8r9CAWCEInzSmulUtykkiEwJs_gyBeoZTuzBhSQM",
    }

    companies = [
        {
            "name": "Heritage Gold House",
            "category": "Wholesale",
            "tier_slug": "prime-signature",
            "admin_priority": 90,
            "city": "Thrissur",
            "state": "Kerala",
            "about": "High-volume manufacturing for regional retailers and premium bridal houses.",
            "daily_capacity": "15kg",
            "specialization": "Bridal gold and statement necklaces",
            "hero_image_url": hero_images["showroom"],
            "admin_user_key": "member",
            "verification": {"gst_registered": True, "bis_hallmarked": True, "export_licensed": False},
            "products": [
                ("Rings", "Classic Gold Band", "10.00", "22K", "Traditional wedding band finished in warm gold.", product_images["ring"]),
                ("Necklaces", "Bridal Mango Haram", "62.00", "22K", "Layered mango-motif bridal haram.", product_images["diamond"]),
            ],
        },
        {
            "name": "Coastal Bullion Works",
            "category": "Manufacturer",
            "tier_slug": "prime-premier",
            "admin_priority": 72,
            "city": "Kochi",
            "state": "Kerala",
            "about": "Casting and finishing line focused on fast-moving daily wear collections.",
            "daily_capacity": "9kg",
            "specialization": "Lightweight chains",
            "hero_image_url": hero_images["bullion"],
            "verification": {"gst_registered": True, "bis_hallmarked": True, "export_licensed": True},
            "products": [
                ("Chains", "Singapore Twist Chain", "14.25", "22K", "Daily wear Singapore twist chain.", product_images["ring"]),
            ],
        },
        {
            "name": "Metro Diamond Studio",
            "category": "Retail",
            "tier_slug": "prime-classic",
            "admin_priority": 84,
            "city": "Chennai",
            "state": "Tamil Nadu",
            "about": "Premium retail showroom with bridal consultations and custom diamond work.",
            "daily_capacity": "4kg",
            "specialization": "Diamond jewellery",
            "hero_image_url": hero_images["diamond"],
            "verification": {"gst_registered": True, "bis_hallmarked": True, "export_licensed": False},
            "products": [
                ("Diamonds", "Etoile Pendant", "2.00", "18K", "Diamond pendant for premium occasion wear.", product_images["diamond"]),
                ("Rings", "Solitaire Halo Ring", "6.40", "18K", "Halo-set solitaire ring for bridal collections.", product_images["ring"]),
            ],
        },
        {
            "name": "Kaveri Ornament Hub",
            "category": "Wholesale",
            "tier_slug": "prime-circle",
            "admin_priority": 50,
            "city": "Coimbatore",
            "state": "Tamil Nadu",
            "about": "Regional wholesaler with fast replenishment for family jewellers.",
            "daily_capacity": "6kg",
            "specialization": "Bangles",
            "hero_image_url": hero_images["artisan"],
            "verification": {"gst_registered": True, "bis_hallmarked": False, "export_licensed": False},
            "products": [
                ("Bangles", "Antiquity Bangles", "45.00", "22K", "Stacked bridal bangles with antique finish.", product_images["bangle"]),
            ],
        },
        {
            "name": "Chickpet Classic Chains",
            "category": "Manufacturer",
            "tier_slug": "prime-premier",
            "admin_priority": 68,
            "city": "Bengaluru",
            "state": "Karnataka",
            "about": "Bulk chain producer with strong daily wear assortments.",
            "daily_capacity": "11kg",
            "specialization": "Machine chains",
            "hero_image_url": hero_images["studio"],
            "verification": {"gst_registered": True, "bis_hallmarked": True, "export_licensed": False},
            "products": [
                ("Chains", "Box Link Chain", "10.10", "22K", "Popular box-link chain for urban storefronts.", product_images["ring"]),
            ],
        },
        {
            "name": "Mysuru Heritage Crafts",
            "category": "Retail",
            "tier_slug": "prime-circle",
            "admin_priority": 42,
            "city": "Mysuru",
            "state": "Karnataka",
            "about": "Traditional handcrafted pieces for festive and temple collections.",
            "daily_capacity": "3kg",
            "specialization": "Coins and antique finish work",
            "hero_image_url": hero_images["warehouse"],
            "verification": {"gst_registered": True, "bis_hallmarked": True, "export_licensed": False},
            "products": [
                ("Coins", "Legacy Bullion Coin", "31.10", "999.9", "Premium bullion coin with heritage motif.", product_images["coin"]),
            ],
        },
        {
            "name": "Regal Necklace Works",
            "category": "Manufacturer",
            "tier_slug": "prime-elite",
            "admin_priority": 66,
            "city": "Hyderabad",
            "state": "Telangana",
            "about": "Large-format necklace and bridal set workshop for high-volume retailers.",
            "daily_capacity": "8kg",
            "specialization": "Statement necklaces",
            "hero_image_url": hero_images["showroom"],
            "verification": {"gst_registered": True, "bis_hallmarked": True, "export_licensed": False},
            "products": [
                ("Necklaces", "Temple Cascade Necklace", "54.50", "22K", "Layered bridal necklace with peacock detailing.", product_images["diamond"]),
            ],
        },
        {
            "name": "Auric Ring Atelier",
            "category": "Retail",
            "tier_slug": "prime-elite",
            "admin_priority": 64,
            "city": "Mumbai",
            "state": "Maharashtra",
            "about": "Boutique atelier focused on premium rings and custom bridal commissions.",
            "daily_capacity": "2kg",
            "specialization": "Custom rings",
            "hero_image_url": hero_images["diamond"],
            "verification": {"gst_registered": True, "bis_hallmarked": True, "export_licensed": False},
            "products": [
                ("Rings", "Solitaire Stack Ring", "5.80", "18K", "Stackable diamond-accent bridal ring.", product_images["ring"]),
            ],
        },
        {
            "name": "CoinCraft Mint",
            "category": "Wholesale",
            "tier_slug": "prime-unique",
            "admin_priority": 36,
            "city": "Jaipur",
            "state": "Rajasthan",
            "about": "Specialist supplier of festive bullion coins and commemorative gifting pieces.",
            "daily_capacity": "7kg",
            "specialization": "Gold coins",
            "hero_image_url": hero_images["bullion"],
            "verification": {"gst_registered": True, "bis_hallmarked": True, "export_licensed": False},
            "products": [
                ("Coins", "Lakshmi Gold Coin", "8.00", "24K", "Festival-ready gold coin with embossed motif.", product_images["coin"]),
            ],
        },
        {
            "name": "Diamond Light House",
            "category": "Retail",
            "tier_slug": "prime-circle",
            "admin_priority": 34,
            "city": "Surat",
            "state": "Gujarat",
            "about": "Contemporary diamond studio supplying lightweight daily wear pieces.",
            "daily_capacity": "5kg",
            "specialization": "Diamond pendants",
            "hero_image_url": hero_images["studio"],
            "verification": {"gst_registered": True, "bis_hallmarked": True, "export_licensed": True},
            "products": [
                ("Diamonds", "Petal Diamond Pendant", "3.25", "18K", "Lightweight pendant for premium daily wear.", product_images["diamond"]),
            ],
        },
        {
            "name": "Bangle Avenue",
            "category": "Manufacturer",
            "tier_slug": "prime-unique",
            "admin_priority": 32,
            "city": "Pune",
            "state": "Maharashtra",
            "about": "Mid-scale workshop producing stackable bangles for festive and bridal assortments.",
            "daily_capacity": "6kg",
            "specialization": "Bangles",
            "hero_image_url": hero_images["artisan"],
            "verification": {"gst_registered": True, "bis_hallmarked": False, "export_licensed": False},
            "products": [
                ("Bangles", "Petal Edge Bangles", "22.50", "22K", "Polished bridal bangles with floral edges.", product_images["bangle"]),
            ],
        },
    ]

    for company_spec in companies:
        tier = tier_by_slug[company_spec["tier_slug"]]
        company = _upsert(
            Company,
            {"name": company_spec["name"]},
            {
                "category": company_spec["category"],
                "tier_ref": tier,
                "city": company_spec["city"],
                "state": company_spec["state"],
                "about": company_spec["about"],
                "daily_capacity": company_spec["daily_capacity"],
                "specialization": company_spec["specialization"],
                "admin_priority": company_spec["admin_priority"],
                "is_active": True,
                "is_approved": True,
            },
        )
        _upsert(CompanyVerification, {"company": company}, company_spec["verification"])
        if company_spec.get("admin_user_key"):
            _upsert(
                UserRole,
                {
                    "user": users[company_spec["admin_user_key"]],
                    "role": UserRole.Role.COMPANY_ADMIN,
                    "scope_type": UserRole.ScopeType.COMPANY,
                    "scope_id": company.id,
                },
                {},
            )

        for category_name, product_name, weight, purity, description, product_image_url in company_spec["products"]:
            category = categories[category_name]
            product = _upsert(
                Product,
                {"company": company, "name": product_name},
                {
                    "category": category,
                    "weight_grams": weight,
                    "purity": purity,
                    "description": description,
                    "is_active": True,
                },
            )
            product_slug = product.name.lower().replace(" ", "-")
            for image_index in range(1, 4):
                product_asset = _seed_media_asset(
                    object_key=f"products/{company.id}/{product_slug}-{image_index}.jpg",
                    uploader=users["member"],
                    bucket_name="demo-public-media",
                    filename=f"{product_slug}-{image_index}.jpg",
                    visibility=MediaAsset.Visibility.PUBLIC,
                    moderation_status=MediaAsset.ModerationStatus.APPROVED,
                    public_url=f"{product_image_url}?v={image_index}",
                )
                _upsert(ProductImage, {"product": product, "asset": product_asset}, {})

        company_asset = _seed_media_asset(
            object_key=f"companies/{company.id}/hero.jpg",
            uploader=users["member"],
            bucket_name="demo-public-media",
            filename=f"{company.name.lower().replace(' ', '-')}.jpg",
            visibility=MediaAsset.Visibility.PUBLIC,
            moderation_status=MediaAsset.ModerationStatus.APPROVED,
            public_url=company_spec["hero_image_url"],
        )
        _upsert(CompanyImage, {"company": company, "is_logo": False}, {"asset": company_asset})

        logo_asset = _seed_media_asset(
            object_key=f"companies/{company.id}/logo.jpg",
            uploader=users["member"],
            bucket_name="demo-public-media",
            filename=f"{company.name.lower().replace(' ', '-')}-logo.jpg",
            visibility=MediaAsset.Visibility.PUBLIC,
            moderation_status=MediaAsset.ModerationStatus.APPROVED,
            public_url=_build_logo_url(company.name),
        )
        _upsert(CompanyImage, {"company": company, "is_logo": True}, {"asset": logo_asset})


def _seed_rates() -> None:
    _upsert(
        AssociationRate,
        {"association": None, "region_label": "Association Board Rate - Previous"},
        {
            "gold_22k": "6765.00",
            "gold_24k": "7395.00",
            "silver": "90.25",
            "effective_at": _aware_datetime(2026, 4, 20, 9, 0),
        },
    )
    _upsert(
        AssociationRate,
        {"association": None, "region_label": "Association Board Rate - Latest"},
        {
            "gold_22k": "6785.00",
            "gold_24k": "7410.00",
            "silver": "89.40",
            "effective_at": _aware_datetime(2026, 4, 21, 9, 0),
        },
    )
    kgsma = Association.objects.get(name="KGSMA")
    akgsma = Association.objects.get(name="AKGSMA")
    tnja = Association.objects.get(name="Tamil Nadu Jewellers Association")
    kgta = Association.objects.get(name="Karnataka Gold Traders Association")
    _upsert(
        AssociationRate,
        {"association": kgsma, "region_label": "KGSMA Previous"},
        {
            "gold_22k": "5440.00",
            "gold_24k": "5890.00",
            "silver": "74.25",
            "effective_at": _aware_datetime(2026, 4, 20, 9, 0),
        },
    )
    _upsert(
        AssociationRate,
        {"association": kgsma, "region_label": "KGSMA Latest"},
        {
            "gold_22k": "5450.00",
            "gold_24k": "5900.00",
            "silver": "75.00",
            "effective_at": _aware_datetime(2026, 4, 21, 10, 30),
        },
    )
    _upsert(
        AssociationRate,
        {"association": akgsma, "region_label": "AKGSMA Previous"},
        {
            "gold_22k": "5415.00",
            "gold_24k": "5860.00",
            "silver": "73.80",
            "effective_at": _aware_datetime(2026, 4, 20, 9, 0),
        },
    )
    _upsert(
        AssociationRate,
        {"association": akgsma, "region_label": "AKGSMA Latest"},
        {
            "gold_22k": "5435.00",
            "gold_24k": "5880.00",
            "silver": "74.50",
            "effective_at": _aware_datetime(2026, 4, 21, 10, 30),
        },
    )
    _upsert(
        AssociationRate,
        {"association": tnja, "region_label": "TNJA Previous"},
        {
            "gold_22k": "5485.00",
            "gold_24k": "5935.00",
            "silver": "75.60",
            "effective_at": _aware_datetime(2026, 4, 20, 9, 0),
        },
    )
    _upsert(
        AssociationRate,
        {"association": tnja, "region_label": "TNJA Latest"},
        {
            "gold_22k": "5495.00",
            "gold_24k": "5950.00",
            "silver": "76.10",
            "effective_at": _aware_datetime(2026, 4, 21, 10, 30),
        },
    )
    _upsert(
        AssociationRate,
        {"association": kgta, "region_label": "KGTA Previous"},
        {
            "gold_22k": "5470.00",
            "gold_24k": "5920.00",
            "silver": "75.20",
            "effective_at": _aware_datetime(2026, 4, 20, 9, 0),
        },
    )
    _upsert(
        AssociationRate,
        {"association": kgta, "region_label": "KGTA Latest"},
        {
            "gold_22k": "5480.00",
            "gold_24k": "5930.00",
            "silver": "75.70",
            "effective_at": _aware_datetime(2026, 4, 21, 10, 30),
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
    kgsma = Association.objects.filter(name="KGSMA").first()

    association_news = _upsert(
        News,
        {"title": "Association onboarding camp expands to new districts"},
        {
            "description": "Regional outreach and member support counters are opening across more association district units this month.",
            "created_by": None,
            "publisher_type": News.PublisherType.ASSOCIATION,
            "publisher_id": kgsma.id if kgsma else None,
            "status": News.Status.PUBLISHED,
            "published_at": now - timedelta(hours=3),
            "rejection_reason": "",
        },
    )
    if kgsma:
        _upsert(
            NewsTarget,
            {
                "news": association_news,
                "target_type": NewsTarget.TargetType.ASSOCIATION,
                "target_id": kgsma.id,
                "mode": NewsTarget.Mode.INCLUDE,
            },
            {},
        )

    urgent_news = _upsert(
        News,
        {"title": "GST update issued for bullion traders"},
        {
            "description": "Updated tax guidance is now available for member businesses.",
            "created_by": None,
            "publisher_type": News.PublisherType.PLATFORM,
            "publisher_id": None,
            "status": News.Status.PUBLISHED,
            "published_at": now - timedelta(hours=1),
            "rejection_reason": "",
        },
    )
    _upsert(
        NewsTarget,
        {
            "news": urgent_news,
            "target_type": NewsTarget.TargetType.PLATFORM,
            "target_id": None,
            "mode": NewsTarget.Mode.INCLUDE,
        },
        {},
    )

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

    super_admin = get_user_model().objects.filter(username="demo_super_admin").first()
    association_admin = get_user_model().objects.filter(username="demo_kgsma_admin").first()
    meeting_specs = [
        {
            "title": "Association Trade Meet",
            "description": "Quarterly association trade meet covering procurement planning and festive sales coordination.",
            "created_by": association_admin,
            "organizer_type": Meeting.OrganizerType.ASSOCIATION,
            "organizer_id": kgsma.id if kgsma else None,
            "start_datetime": now + timedelta(days=2),
            "end_datetime": now + timedelta(days=2, hours=3),
            "venue_name": "Thrissur Trade Hall",
            "venue_address": "Round North, Thrissur, Kerala",
            "google_maps_link": "https://maps.google.com/?q=Thrissur+Trade+Hall",
            "meeting_mode": Meeting.MeetingMode.PHYSICAL,
            "online_meeting_link": "",
            "status": Meeting.Status.PUBLISHED,
            "include_targets": [
                {
                    "target_type": MeetingTarget.TargetType.ASSOCIATION,
                    "target_id": kgsma.id if kgsma else None,
                }
            ],
            "exclude_targets": [],
        },
        {
            "title": "Bullion Compliance Workshop",
            "description": "Platform-level online workshop for current bullion compliance, invoicing, and record checks.",
            "created_by": super_admin,
            "organizer_type": Meeting.OrganizerType.PLATFORM,
            "organizer_id": None,
            "start_datetime": now + timedelta(days=5),
            "end_datetime": now + timedelta(days=5, hours=2),
            "venue_name": "Virtual Session",
            "venue_address": "",
            "google_maps_link": "",
            "meeting_mode": Meeting.MeetingMode.ONLINE,
            "online_meeting_link": "https://meet.google.com/demo-bullion-workshop",
            "status": Meeting.Status.PUBLISHED,
            "include_targets": [{"target_type": MeetingTarget.TargetType.PLATFORM, "target_id": None}],
            "exclude_targets": [],
        },
        {
            "title": "Retail Growth Forum",
            "description": "Hybrid planning session on inventory turns, bridal campaigns, and high-margin assortment strategy.",
            "created_by": super_admin,
            "organizer_type": Meeting.OrganizerType.PLATFORM,
            "organizer_id": None,
            "start_datetime": now + timedelta(days=9),
            "end_datetime": now + timedelta(days=9, hours=4),
            "venue_name": "Chennai Business Centre",
            "venue_address": "T Nagar, Chennai, Tamil Nadu",
            "google_maps_link": "https://maps.google.com/?q=Chennai+Business+Centre",
            "meeting_mode": Meeting.MeetingMode.HYBRID,
            "online_meeting_link": "https://meet.google.com/demo-retail-growth",
            "status": Meeting.Status.PUBLISHED,
            "include_targets": [{"target_type": MeetingTarget.TargetType.PLATFORM, "target_id": None}],
            "exclude_targets": [],
        },
    ]

    for spec in meeting_specs:
        meeting = _upsert(
            Meeting,
            {"title": spec["title"]},
            {
                "description": spec["description"],
                "created_by": spec["created_by"],
                "organizer_type": spec["organizer_type"],
                "organizer_id": spec["organizer_id"],
                "start_datetime": spec["start_datetime"],
                "end_datetime": spec["end_datetime"],
                "venue_name": spec["venue_name"],
                "venue_address": spec["venue_address"],
                "google_maps_link": spec["google_maps_link"],
                "meeting_mode": spec["meeting_mode"],
                "online_meeting_link": spec["online_meeting_link"],
                "status": spec["status"],
            },
        )
        for target in spec["include_targets"]:
            _upsert(
                MeetingTarget,
                {
                    "meeting": meeting,
                    "target_type": target["target_type"],
                    "target_id": target["target_id"],
                    "mode": MeetingTarget.Mode.INCLUDE,
                },
                {},
            )
        for target in spec["exclude_targets"]:
            _upsert(
                MeetingTarget,
                {
                    "meeting": meeting,
                    "target_type": target["target_type"],
                    "target_id": target["target_id"],
                    "mode": MeetingTarget.Mode.EXCLUDE,
                },
                {},
            )


def _seed_ads(users: dict[str, object], hierarchy: dict[str, dict[str, object]]) -> None:
    current_time = timezone.now()
    campaign_specs = [
        {
            "title": "Akshaya Tritiya Launch Banner",
            "description": "Preview festive collection drops and early member-only offers before the seasonal rush.",
            "background_color": "#92400E",
            "priority": 120,
            "filename": "akshaya-tritiya-launch-banner.jpg",
            "public_url": "https://placehold.co/1200x675/92400E/FFF7ED?text=Akshaya+Tritiya+Launch",
            "action_type": Advertisement.ActionType.EXTERNAL_URL,
            "action_payload": {"url": "https://example.com/akshaya-tritiya"},
            "notes": "Creative approved for premium dashboard placement.",
        },
        {
            "title": "Temple Cascade Necklace Spotlight",
            "description": "Jump directly to a bestselling bridal product from Regal Necklace Works.",
            "background_color": "#1F3A5F",
            "priority": 95,
            "filename": "temple-cascade-necklace.jpg",
            "public_url": "https://placehold.co/1200x675/1F3A5F/F8FAFC?text=Temple+Cascade+Necklace",
            "action_type": Advertisement.ActionType.PRODUCT,
            "action_payload": {"product_id": Product.objects.get(name="Temple Cascade Necklace").id, "company_id": Company.objects.get(name="Regal Necklace Works").id},
            "notes": "Approved product spotlight for dashboard rotation.",
        },
        {
            "title": "Explore Coastal Bullion Works",
            "description": "Open the company profile to browse verification and active product listings.",
            "background_color": "#0F766E",
            "priority": 88,
            "filename": "coastal-bullion-works.jpg",
            "public_url": "https://placehold.co/1200x675/0F766E/ECFEFF?text=Coastal+Bullion+Works",
            "action_type": Advertisement.ActionType.COMPANY,
            "action_payload": {"company_id": Company.objects.get(name="Coastal Bullion Works").id},
            "notes": "Approved company showcase for dashboard rotation.",
        },
        {
            "title": "Browse Ring Collections",
            "description": "Take shoppers to the product search flow filtered to rings.",
            "background_color": "#7C3AED",
            "priority": 74,
            "filename": "browse-ring-collections.jpg",
            "public_url": "https://placehold.co/1200x675/7C3AED/F5F3FF?text=Browse+Ring+Collections",
            "action_type": Advertisement.ActionType.CATEGORY,
            "action_payload": {"category": "Rings"},
            "notes": "Approved category campaign for dashboard rotation.",
        },
        {
            "title": "Open the Market Directory",
            "description": "Navigate members to the live market feed from a dashboard promotion.",
            "background_color": "#B45309",
            "priority": 60,
            "filename": "open-market-directory.jpg",
            "public_url": "https://placehold.co/1200x675/B45309/FFFBEB?text=Open+the+Market+Directory",
            "action_type": Advertisement.ActionType.INTERNAL_SCREEN,
            "action_payload": {"screen": "Market", "params": {}},
            "notes": "Approved internal navigation campaign.",
        },
    ]

    for spec in campaign_specs:
        advertisement = _upsert(
            Advertisement,
            {"advertiser": users["advertiser"], "title": spec["title"]},
            {
                "description": spec["description"],
                "label_text": "ADVERTISEMENT",
                "background_color": spec["background_color"],
                "placement": Advertisement.Placement.DASHBOARD_HERO,
                "action_type": spec["action_type"],
                "action_payload": spec["action_payload"],
                "priority": spec["priority"],
                "is_active": True,
                "reach": "state",
                "status": Advertisement.Status.APPROVED,
                "start_date": current_time - timedelta(days=1),
                "end_date": current_time + timedelta(days=21),
                "approved_by": users["admin"],
                "approved_at": current_time,
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
            object_key=f"ads/{users['advertiser'].id}/{spec['filename']}",
            uploader=users["advertiser"],
            bucket_name="demo-public-media",
            filename=spec["filename"],
            visibility=MediaAsset.Visibility.PUBLIC,
            moderation_status=MediaAsset.ModerationStatus.APPROVED,
            public_url=spec["public_url"],
        )
        _upsert(
            AdAsset,
            {"advertisement": advertisement},
            {
                "asset": ad_asset,
                "placement": Advertisement.Placement.DASHBOARD_HERO,
            },
        )
        _upsert(
            AdApproval,
            {"advertisement": advertisement},
            {
                "approved_by": users["admin"],
                "notes": spec["notes"],
                "approved_at": current_time,
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
