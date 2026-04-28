from django.urls import path

from .views import MeetingCancelView, MeetingDetailView, MeetingListCreateView, MeetingRespondView

urlpatterns = [
    path("", MeetingListCreateView.as_view(), name="meeting_list_create"),
    path("<int:pk>/", MeetingDetailView.as_view(), name="meeting_detail"),
    path("<int:pk>/cancel/", MeetingCancelView.as_view(), name="meeting_cancel"),
    path("<int:pk>/respond/", MeetingRespondView.as_view(), name="meeting_respond"),
]
