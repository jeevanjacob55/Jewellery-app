from rest_framework import serializers


class UrgentAlertSerializer(serializers.Serializer):
    title = serializers.CharField()
    summary = serializers.CharField(allow_blank=True)


class MeetingSerializer(serializers.Serializer):
    title = serializers.CharField()
    venue = serializers.CharField()
    calendar_url = serializers.CharField(allow_blank=True)


class TickerSerializer(serializers.Serializer):
    gold = serializers.FloatField()
    silver = serializers.FloatField()


class NewsFeedResponseSerializer(serializers.Serializer):
    urgent_alert = UrgentAlertSerializer()
    meetings = MeetingSerializer(many=True)
    ticker = TickerSerializer()
