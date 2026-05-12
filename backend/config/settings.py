from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, True),
    JWT_ACCESS_MINUTES=(int, 30),
    JWT_REFRESH_DAYS=(int, 7),
    MEDIA_SIGNED_URL_TTL=(int, 900),
    COMPANY_PLAN_UPGRADE_URL=(str, ""),
    DIRECTORY_MARKET_ZONE_FEED_ENABLED=(bool, False),
    DIRECTORY_MARKET_MIXED_FEED_ENABLED=(bool, False),
    DIRECTORY_MARKET_FAIRNESS_ENABLED=(bool, False),
    DIRECTORY_MARKET_FAIRNESS_WINDOW_DAYS=(int, 7),
    DASHBOARD_WELCOME_FILMSTRIP_ENABLED=(bool, False),
    DASHBOARD_WELCOME_FILMSTRIP_DURATION_SECONDS=(int, 5),
    DASHBOARD_WELCOME_FILMSTRIP_SCROLL_SPEED=(str, "medium"),
    DASHBOARD_WELCOME_FILMSTRIP_MAX_ITEMS=(int, 10),
    DASHBOARD_WELCOME_FILMSTRIP_RESHOW_POLICY=(str, "next_app_launch"),
)
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY", default="django-insecure-change-me")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = [host.strip() for host in env("ALLOWED_HOSTS", default="127.0.0.1,localhost").split(",") if host.strip()]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "apps.accounts",
    "apps.regions",
    "apps.rates",
    "apps.directory",
    "apps.reverse_search",
    "apps.services_app",
    "apps.news",
    "apps.ads",
    "apps.admin_ops",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
}

default_database = DATABASES["default"]
database_name = default_database.get("NAME")
if default_database.get("ENGINE") == "django.db.backends.sqlite3" and database_name:
    sqlite_path = Path(database_name)
    if not sqlite_path.is_absolute():
        default_database["NAME"] = str((BASE_DIR / sqlite_path).resolve())

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Calcutta"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env("JWT_ACCESS_MINUTES")),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env("JWT_REFRESH_DAYS")),
}

CORS_ALLOWED_ORIGINS = [
    origin.strip() for origin in env("CORS_ALLOWED_ORIGINS", default="").split(",") if origin.strip()
]

GCS_BUCKET_NAME = env("GCS_BUCKET_NAME", default="")
GCS_PRIVATE_BUCKET_NAME = env("GCS_PRIVATE_BUCKET_NAME", default="")
MEDIA_SIGNED_URL_TTL = env("MEDIA_SIGNED_URL_TTL")
COMPANY_PLAN_UPGRADE_URL = env("COMPANY_PLAN_UPGRADE_URL", default="").strip()
DIRECTORY_MARKET_ZONE_FEED_ENABLED = env("DIRECTORY_MARKET_ZONE_FEED_ENABLED")
DIRECTORY_MARKET_MIXED_FEED_ENABLED = env("DIRECTORY_MARKET_MIXED_FEED_ENABLED")
DIRECTORY_MARKET_FAIRNESS_ENABLED = env("DIRECTORY_MARKET_FAIRNESS_ENABLED")
DIRECTORY_MARKET_FAIRNESS_WINDOW_DAYS = env("DIRECTORY_MARKET_FAIRNESS_WINDOW_DAYS")
DASHBOARD_WELCOME_FILMSTRIP_ENABLED = env("DASHBOARD_WELCOME_FILMSTRIP_ENABLED")
DASHBOARD_WELCOME_FILMSTRIP_DURATION_SECONDS = env("DASHBOARD_WELCOME_FILMSTRIP_DURATION_SECONDS")
DASHBOARD_WELCOME_FILMSTRIP_SCROLL_SPEED = env("DASHBOARD_WELCOME_FILMSTRIP_SCROLL_SPEED")
DASHBOARD_WELCOME_FILMSTRIP_MAX_ITEMS = env("DASHBOARD_WELCOME_FILMSTRIP_MAX_ITEMS")
DASHBOARD_WELCOME_FILMSTRIP_RESHOW_POLICY = env("DASHBOARD_WELCOME_FILMSTRIP_RESHOW_POLICY")
