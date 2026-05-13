from django.http import HttpResponse
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.media_platform.service import get_storage_provider


class MediaUploadView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def put(self, request):
        object_key = request.query_params.get("object_key")
        if not object_key:
            return Response({"object_key": ["This query parameter is required."]}, status=status.HTTP_400_BAD_REQUEST)

        content_type = request.headers.get("Content-Type", "application/octet-stream")
        try:
            get_storage_provider().store_upload(object_key=object_key, content_type=content_type, content=request.body)
        except NotImplementedError:
            return Response({"detail": "Direct application uploads are not enabled for the configured storage provider."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get(self, request):
        object_key = request.query_params.get("object_key")
        if not object_key:
            return Response({"object_key": ["This query parameter is required."]}, status=status.HTTP_400_BAD_REQUEST)

        try:
            upload = get_storage_provider().read_upload(object_key=object_key)
        except NotImplementedError:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if upload is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        content, content_type = upload
        return HttpResponse(content, content_type=content_type)
