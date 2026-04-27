from rest_framework import serializers


class ComplianceOverviewItemSerializer(serializers.Serializer):
    title = serializers.CharField()
    status = serializers.CharField()


class ComplianceMetricsSerializer(serializers.Serializer):
    average_tat_days = serializers.FloatField()
    accuracy = serializers.CharField()


class ComplianceDashboardResponseSerializer(serializers.Serializer):
    overview = ComplianceOverviewItemSerializer(many=True)
    services = serializers.ListField(child=serializers.CharField())
    metrics = ComplianceMetricsSerializer()
