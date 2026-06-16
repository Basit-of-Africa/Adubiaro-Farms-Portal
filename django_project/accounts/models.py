from django.db import models
from django.contrib.auth.models import AbstractUser

class UserRole(models.TextChoices):
    ADMIN = 'admin', 'Super Admin'
    FARM_MANAGER = 'farm_manager', 'Farm Manager'
    INVESTOR = 'investor', 'Investor'

class User(AbstractUser):
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.INVESTOR
    )
    phone = models.CharField(max_length=20, blank=True, null=True)
    profile_photo = models.ImageField(upload_to='profiles/', blank=True, null=True)

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"
