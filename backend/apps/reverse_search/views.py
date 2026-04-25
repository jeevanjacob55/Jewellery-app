from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from config.storage import build_mock_signed_upload

from .models import ReverseSearchRequest
from .serializers import ReverseSearchRequestSerializer


class ReverseSearchListCreateView(APIView):
    def get(self, request):
        queryset = ReverseSearchRequest.objects.filter(created_by=request.user).prefetch_related("responses")
        return Response(ReverseSearchRequestSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = ReverseSearchRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(created_by=request.user)
        return Response(ReverseSearchRequestSerializer(instance).data, status=status.HTTP_201_CREATED)


class ReverseSearchUploadSessionView(APIView):
    def post(self, request):
        request_id = request.data.get("request_id", "new-request")
        filename = request.data.get("filename", "reference-image.jpg")
        session = build_mock_signed_upload("reverse-search/original", request_id, filename, visibility="private")
        return Response(session.__dict__)


class ReverseSearchStatusListView(ListAPIView):
    serializer_class = ReverseSearchRequestSerializer

    def get_queryset(self):
        return ReverseSearchRequest.objects.filter(created_by=self.request.user).prefetch_related("responses")
