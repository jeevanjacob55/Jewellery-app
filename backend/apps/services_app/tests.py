from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import ComplianceReminder, ComplianceRequest, ServiceType


class ServicesDashboardTests(APITestCase):
    def test_services_dashboard_returns_empty_state_when_no_records_exist(self):
        response = self.client.get(reverse("services_dashboard"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["overview"], [])
        self.assertEqual(response.data["services"], [])
        self.assertEqual(response.data["metrics"]["average_tat_days"], 0.0)
        self.assertEqual(response.data["metrics"]["accuracy"], "N/A")

    def test_services_dashboard_normalizes_requests_reminders_and_metrics(self):
        hallmarking = ServiceType.objects.create(name="Hallmarking", average_turnaround_days=6, accuracy_metric="")
        ServiceType.objects.create(name="Calibration", average_turnaround_days=4, accuracy_metric="98.6%")
        ServiceType.objects.create(name="Diamond Certification", average_turnaround_days=3, accuracy_metric="")

        ComplianceRequest.objects.create(
            service_type=hallmarking,
            business_name="Metro Diamond Studio",
            due_in_days=0,
            status="action_required",
        )
        ComplianceRequest.objects.create(
            service_type=hallmarking,
            business_name="Heritage Gold House",
            due_in_days=2,
            status="in_review",
        )
        ComplianceRequest.objects.create(
            service_type=hallmarking,
            business_name="Closed Account",
            due_in_days=1,
            status="closed",
        )
        ComplianceReminder.objects.create(title="License Renewal", due_in_days=0, severity="action_required")
        ComplianceReminder.objects.create(title="GST Filing Check", due_in_days=3, severity="attention")

        response = self.client.get(reverse("services_dashboard"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["overview"][0], {"title": "Hallmarking - Metro Diamond Studio", "status": "Action Required"})
        self.assertEqual(response.data["overview"][1], {"title": "License Renewal", "status": "Action Required"})
        self.assertEqual(response.data["overview"][2], {"title": "Hallmarking - Heritage Gold House", "status": "Due in 2 days"})
        self.assertEqual(response.data["services"], ["Calibration", "Diamond Certification", "Hallmarking"])
        self.assertEqual(response.data["metrics"]["average_tat_days"], 4.3)
        self.assertEqual(response.data["metrics"]["accuracy"], "98.6%")
