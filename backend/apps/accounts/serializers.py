from rest_framework import serializers

from .models import MemberProfile, NotificationPreference, User


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ["rate_alerts", "news_alerts", "ad_alerts", "meeting_alerts"]


class MemberProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberProfile
        fields = ["phone_number", "company_name", "state_name", "district_name", "local_chapter_name", "membership_tier"]


class UserSerializer(serializers.ModelSerializer):
    member_profile = MemberProfileSerializer(read_only=True)
    notification_preferences = NotificationPreferenceSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "corporate_email",
            "role",
            "jeweller_id",
            "is_verified_member",
            "onboarding_completed",
            "member_profile",
            "notification_preferences",
        ]


class GuestAccessSerializer(serializers.Serializer):
    guest_name = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100)
    district = serializers.CharField(max_length=100, required=False, allow_blank=True)
