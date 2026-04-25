from django.urls import path

from .views import ReverseSearchListCreateView, ReverseSearchStatusListView, ReverseSearchUploadSessionView

urlpatterns = [
    path("", ReverseSearchListCreateView.as_view(), name="reverse_search_list_create"),
    path("status/", ReverseSearchStatusListView.as_view(), name="reverse_search_status"),
    path("upload-session/", ReverseSearchUploadSessionView.as_view(), name="reverse_search_upload_session"),
]
