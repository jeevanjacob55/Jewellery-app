from rest_framework import permissions
from rest_framework.generics import ListAPIView

from .models import RegionState
from .serializers import RegionStateSerializer


class RegionHierarchyView(ListAPIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    queryset = RegionState.objects.prefetch_related("associations__district_units__units").all()
    serializer_class = RegionStateSerializer
