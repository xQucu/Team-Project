from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    EXPERIENCE_CHOICES = [
        ("beginner", "Beginner"),
        ("short_distance", "Short Distance"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    age = models.IntegerField(null=True, blank=True)
    weight = models.FloatField(null=True, blank=True)
    height = models.FloatField(null=True, blank=True)
    experience_level = models.CharField(max_length=20, choices=EXPERIENCE_CHOICES, blank=True)
    fitness_goal = models.CharField(max_length=100, blank=True)
    training_days_per_week = models.IntegerField(null=True, blank=True)
    injuries = models.TextField(blank=True)
    goals = models.JSONField(default=list)
    has_completed_onboarding = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile for {self.user.username}"


class WorkoutSession(models.Model):
    STATUS_CHOICES = [
        ("planned", "Planned"),
        ("completed", "Completed"),
        ("missed", "Missed"),
    ]

    TYPE_CHOICES = [
        ("easy_run", "Easy Run"),
        ("intervals", "Intervals"),
        ("long_run", "Long Run"),
        ("tempo", "Tempo Run"),
        ("rest", "Rest Day"),
        ("speed", "Speed Work"),
        ("hill", "Hill Repeats"),
        ("recovery", "Recovery Run"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="workouts")
    date = models.DateField()
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    duration = models.CharField(max_length=50)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="planned")
    completed_at = models.DateTimeField(null=True, blank=True)
    week_number = models.IntegerField()
    month_number = models.IntegerField()
    ai_summary = models.TextField(null=True, blank=True)
    total_duration_seconds = models.IntegerField(null=True, blank=True)
    total_distance_km = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)
    avg_heart_rate = models.IntegerField(null=True, blank=True)
    max_heart_rate = models.IntegerField(null=True, blank=True)
    avg_speed_kmh = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        unique_together = ["user", "date"]
        ordering = ["date"]

    def __str__(self):
        return f"{self.user.username} - {self.date} - {self.type}"


class WorkoutDataPoint(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="data_points")
    workout_session = models.ForeignKey(WorkoutSession, on_delete=models.CASCADE, related_name="data_points")
    timestamp = models.DateTimeField(auto_now_add=True)
    elapsed_seconds = models.IntegerField()
    distance_km = models.DecimalField(max_digits=6, decimal_places=3)
    speed_kmh = models.DecimalField(max_digits=5, decimal_places=2)
    heart_rate = models.IntegerField(null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    class Meta:
        ordering = ['elapsed_seconds']


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)