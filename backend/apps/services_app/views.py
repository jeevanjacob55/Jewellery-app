from statistics import mean

from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ComplianceReminder, ComplianceRequest, ServiceType
from .serializers import ComplianceDashboardResponseSerializer


def _title_case(value: str) -> str:
    return value.replace("_", " ").title()


def _due_status(due_in_days: int, fallback: str) -> str:
    if due_in_days > 0:
        return f"Due in {due_in_days} day{'s' if due_in_days != 1 else ''}"
    return _title_case(fallback)


def build_compliance_dashboard_payload() -> dict:
    open_requests = ComplianceRequest.objects.exclude(status__in=["completed", "closed"]).select_related("service_type").order_by(
        "due_in_days",
        "created_at",
        "id",
    )
    reminders = ComplianceReminder.objects.order_by("due_in_days", "title", "id")
    service_types = ServiceType.objects.order_by("name")

    overview = [
        {
            "title": f"{request.service_type.name} - {request.business_name}",
            "status": _due_status(request.due_in_days, request.status),
            "_sort_due": request.due_in_days,
        }
        for request in open_requests
    ]
    overview.extend(
        {
            "title": reminder.title,
            "status": _due_status(reminder.due_in_days, reminder.severity),
            "_sort_due": reminder.due_in_days,
        }
        for reminder in reminders
    )
    overview.sort(key=lambda item: (item["_sort_due"], item["title"]))

    accuracy = next((service_type.accuracy_metric for service_type in service_types if service_type.accuracy_metric), "N/A")
    average_tat_days = round(mean(service_type.average_turnaround_days for service_type in service_types), 1) if service_types else 0.0

    return {
        "overview": [{"title": item["title"], "status": item["status"]} for item in overview],
        "services": [service_type.name for service_type in service_types],
        "metrics": {
            "average_tat_days": float(average_tat_days),
            "accuracy": accuracy,
        },
    }


class ComplianceDashboardView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        payload = build_compliance_dashboard_payload()
        return Response(ComplianceDashboardResponseSerializer(payload).data)
