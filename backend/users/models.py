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


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)