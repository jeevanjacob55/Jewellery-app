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


class DashboardAssociationContextSerializer(serializers.Serializer):
    id = serializers.IntegerField(allow_null=True)
    name = serializers.CharField()


class DashboardAssociationRateSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    gold_22k = serializers.FloatField()
    gold_24k = serializers.FloatField()
    silver = serializers.FloatField()


class StateAssociationRateSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    gold_22k = serializers.FloatField()
    gold_24k = serializers.FloatField()
    silver = serializers.FloatField()


class StateRateSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    associations = StateAssociationRateSerializer(many=True)


class DashboardGlobalTrendsSerializer(serializers.Serializer):
    usd_inr = serializers.FloatField()
    gold_oz = serializers.FloatField()
    silver_oz = serializers.FloatField()


class DashboardResponseSerializer(serializers.Serializer):
    association = DashboardAssociationContextSerializer()
    updated_at_label = serializers.CharField()
    headline_rates = DashboardHeadlineRatesSerializer()
    comparisons = DashboardComparisonSerializer(many=True)
    other_associations = DashboardAssociationRateSummarySerializer(many=True)
    global_trends = DashboardGlobalTrendsSerializer()
    quick_actions = serializers.ListField(child=serializers.CharField())


class StateRatesResponseSerializer(serializers.Serializer):
    states = StateRateSummarySerializer(many=True)
