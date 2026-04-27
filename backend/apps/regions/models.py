from django.db import models


class RegionState(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self) -> str:
        return self.name


class Association(models.Model):
    state = models.ForeignKey(RegionState, on_delete=models.CASCADE, related_name="associations")
    name = models.CharField(max_length=100)

    class Meta:
        unique_together = ("state", "name")

    def __str__(self) -> str:
        return f"{self.name}, {self.state.name}"


class DistrictOperationalUnit(models.Model):
    association = models.ForeignKey(Association, on_delete=models.CASCADE, related_name="district_units")
    name = models.CharField(max_length=100)

    class Meta:
        unique_together = ("association", "name")

    def __str__(self) -> str:
        return f"{self.name}, {self.association.name}"


class Unit(models.Model):
    district_operational_unit = models.ForeignKey(
        DistrictOperationalUnit,
        on_delete=models.CASCADE,
        related_name="units",
    )
    name = models.CharField(max_length=100)

    class Meta:
        unique_together = ("district_operational_unit", "name")

    def __str__(self) -> str:
        return f"{self.name}, {self.district_operational_unit.name}"
