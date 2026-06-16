from django.db import models
from django.conf import settings
from farms.models import Farm

class UpdateType(models.TextChoices):
    GENERAL = 'general', 'General Update'
    PLANTING = 'planting', 'Planting Cycle'
    GROWTH = 'growth', 'Crop Growth'
    HARVEST = 'harvest', 'Harvest Event'
    MAINTENANCE = 'maintenance', 'Site Maintenance'
    WEATHER = 'weather', 'Weather Alert'
    PEST = 'pest', 'Pest Control'
    MILESTONE = 'milestone', 'Milestone Completed'

class FarmUpdate(models.Model):
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='updates')
    posted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    body = models.TextField()
    update_type = models.CharField(
        max_length=20,
        choices=UpdateType.choices,
        default=UpdateType.GENERAL
    )
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} — {self.farm.name}"

class UpdatePhoto(models.Model):
    update = models.ForeignKey(FarmUpdate, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(upload_to='updates/')
    caption = models.CharField(max_length=250, blank=True, null=True)

    def __str__(self):
        return f"Photo for {self.update.title}"
