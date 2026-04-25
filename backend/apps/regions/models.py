from django.db import models


class RegionState(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self) -> str:
        return self.name


class RegionDistrict(models.Model):
    state = models.ForeignKey(RegionState, on_delete=models.CASCADE, related_name="districts")
    name = models.CharField(max_length=100)

    class Meta:
        unique_together = ("state", "name")

    def __str__(self) -> str:
        return f"{self.name}, {self.state.name}"


class LocalChapter(models.Model):
    district = models.ForeignKey(RegionDistrict, on_delete=models.CASCADE, related_name="chapters")
    name = models.CharField(max_length=100)

    class Meta:
        unique_together = ("district", "name")

    def __str__(self) -> str:
        return f"{self.name}, {self.district.name}"
