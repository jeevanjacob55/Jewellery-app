from rest_framework import serializers


class DashboardHeadlineRateSerializer(serializers.Serializer):
    value = serializers.FloatField()
    trend = serializers.CharField()


class DashboardHeadlineRatesSerializer(serializers.Serializer):
    gold_22k = DashboardHeadlineRateSerializer()
    gold_24k = DashboardHeadlineRateSerializer()
    silver = DashboardHeadlineRateSerializer()


class DashboardComparisonSerializer(serializers.Serializer):
    label = serializers.CharField()
    gold_22k = serializers.FloatField()


class DashboardGlobalTrendsSerializer(serializers.Serializer):
    usd_inr = serializers.FloatField()
    gold_oz = serializers.FloatField()
    silver_oz = serializers.FloatField()


class DashboardResponseSerializer(serializers.Serializer):
    headline_rates = DashboardHeadlineRatesSerializer()
    comparisons = DashboardComparisonSerializer(many=True)
    global_trends = DashboardGlobalTrendsSerializer()
    quick_actions = serializers.ListField(child=serializers.CharField())
