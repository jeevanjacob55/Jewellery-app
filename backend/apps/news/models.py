from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class News(models.Model):
    class PublisherType(models.TextChoices):
        PLATFORM = "platform", "Platform"
        ASSOCIATION = "association", "Association"
        UNIT = "unit", "Unit"
        COMPANY = "company", "Company"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING_APPROVAL = "pending_approval", "Pending Approval"
        PUBLISHED = "published", "Published"
        REJECTED = "rejected", "Rejected"
        ARCHIVED = "archived", "Archived"

    title = models.CharField(max_length=255)
    description = models.TextField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_news_items")
    publisher_type = models.CharField(max_length=20, choices=PublisherType.choices)
    publisher_id = models.PositiveBigIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_news_items",
    )
    published_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-published_at", "-updated_at", "-id"]

    def clean(self):
        if self.publisher_type == self.PublisherType.PLATFORM and self.publisher_id is not None:
            raise ValidationError({"publisher_id": "Platform news must not define a publisher id."})
        if self.publisher_type != self.PublisherType.PLATFORM and self.publisher_id is None:
            raise ValidationError({"publisher_id": "A publisher id is required for non-platform news."})

    def publish(self, *, approved_by=None):
        self.status = self.Status.PUBLISHED
        self.approved_by = approved_by
        self.rejection_reason = ""
        if self.published_at is None:
            self.published_at = timezone.now()

    def __str__(self) -> str:
        return self.title


class NewsTarget(models.Model):
    class TargetType(models.TextChoices):
        PLATFORM = "platform", "Platform"
        STATE = "state", "State"
        ASSOCIATION = "association", "Association"
        UNIT = "unit", "Unit"
        COMPANY = "company", "Company"
        USER = "user", "User"

    class Mode(models.TextChoices):
        INCLUDE = "include", "Include"
        EXCLUDE = "exclude", "Exclude"

    news = models.ForeignKey(News, on_delete=models.CASCADE, related_name="targets")
    target_type = models.CharField(max_length=20, choices=TargetType.choices)
    target_id = models.PositiveBigIntegerField(null=True, blank=True)
    mode = models.CharField(max_length=10, choices=Mode.choices)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["news", "target_type", "target_id", "mode"], name="uniq_news_target_mode"),
        ]

    def clean(self):
        if self.target_type == self.TargetType.PLATFORM and self.target_id is not None:
            raise ValidationError({"target_id": "Platform targets must not define a target id."})
        if self.target_type != self.TargetType.PLATFORM and self.target_id is None:
            raise ValidationError({"target_id": "A target id is required for non-platform targets."})

    def __str__(self) -> str:
        target_label = "all" if self.target_id is None else str(self.target_id)
        return f"{self.news_id}:{self.mode}:{self.target_type}:{target_label}"


class NewsItem(models.Model):
    title = models.CharField(max_length=255)
    summary = models.TextField()
    is_urgent = models.BooleanField(default=False)
    published_at = models.DateTimeField(auto_now_add=True)


class Alert(models.Model):
    title = models.CharField(max_length=255)
    body = models.TextField()
    severity = models.CharField(max_length=50, default="info")
    active = models.BooleanField(default=True)


class MeetingEvent(models.Model):
    title = models.CharField(max_length=255)
    venue = models.CharField(max_length=255)
    starts_at = models.DateTimeField()
    calendar_url = models.URLField(blank=True)


class Meeting(models.Model):
    class OrganizerType(models.TextChoices):
        PLATFORM = "platform", "Platform"
        ASSOCIATION = "association", "Association"
        UNIT = "unit", "Unit"
        COMPANY = "company", "Company"

    class MeetingMode(models.TextChoices):
        PHYSICAL = "physical", "Physical"
        ONLINE = "online", "Online"
        HYBRID = "hybrid", "Hybrid"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"

    title = models.CharField(max_length=255)
    description = models.TextField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_meetings")
    organizer_type = models.CharField(max_length=20, choices=OrganizerType.choices)
    organizer_id = models.PositiveBigIntegerField(null=True, blank=True)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    venue_name = models.CharField(max_length=255, blank=True)
    venue_address = models.TextField(blank=True)
    google_maps_link = models.URLField(blank=True)
    meeting_mode = models.CharField(max_length=20, choices=MeetingMode.choices)
    online_meeting_link = models.URLField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_datetime", "id"]

    def clean(self):
        if self.organizer_type == self.OrganizerType.PLATFORM and self.organizer_id is not None:
            raise ValidationError({"organizer_id": "Platform meetings must not define an organizer id."})
        if self.organizer_type != self.OrganizerType.PLATFORM and self.organizer_id is None:
            raise ValidationError({"organizer_id": "A non-platform meeting requires an organizer id."})
        if self.end_datetime <= self.start_datetime:
            raise ValidationError({"end_datetime": "Meeting end time must be after the start time."})
        if self.meeting_mode == self.MeetingMode.PHYSICAL and self.online_meeting_link:
            return
        if self.meeting_mode in {self.MeetingMode.ONLINE, self.MeetingMode.HYBRID} and not self.online_meeting_link:
            raise ValidationError({"online_meeting_link": "Online and hybrid meetings require an online meeting link."})

    def __str__(self) -> str:
        return self.title


class MeetingTarget(models.Model):
    class TargetType(models.TextChoices):
        PLATFORM = "platform", "Platform"
        STATE = "state", "State"
        ASSOCIATION = "association", "Association"
        UNIT = "unit", "Unit"
        COMPANY = "company", "Company"
        USER = "user", "User"

    class Mode(models.TextChoices):
        INCLUDE = "include", "Include"
        EXCLUDE = "exclude", "Exclude"

    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name="targets")
    target_type = models.CharField(max_length=20, choices=TargetType.choices)
    target_id = models.PositiveBigIntegerField(null=True, blank=True)
    mode = models.CharField(max_length=10, choices=Mode.choices)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["meeting", "target_type", "target_id", "mode"], name="uniq_meeting_target_mode"),
        ]

    def clean(self):
        if self.target_type == self.TargetType.PLATFORM and self.target_id is not None:
            raise ValidationError({"target_id": "Platform targets must not define a target id."})
        if self.target_type != self.TargetType.PLATFORM and self.target_id is None:
            raise ValidationError({"target_id": "A target id is required for non-platform targets."})

    def __str__(self) -> str:
        target_label = "all" if self.target_id is None else str(self.target_id)
        return f"{self.meeting_id}:{self.mode}:{self.target_type}:{target_label}"


class MeetingResponse(models.Model):
    class ResponseType(models.TextChoices):
        ATTENDING = "attending", "Attending"
        MAYBE = "maybe", "Maybe"
        NOT_ATTENDING = "not_attending", "Not Attending"

    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name="responses")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="meeting_responses")
    response = models.CharField(max_length=20, choices=ResponseType.choices)
    responded_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["meeting", "user"], name="uniq_meeting_user_response"),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.meeting_id}:{self.response}"
