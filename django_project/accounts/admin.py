from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'name_or_username', 'role', 'phone', 'is_active')
    list_filter = ('role', 'is_active', 'is_staff')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Profile Options', {'fields': ('role', 'phone', 'profile_photo')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Custom Profile Options', {'fields': ('role', 'phone', 'profile_photo')}),
    )

    def name_or_username(self, obj):
        return obj.get_full_name() or obj.username
    name_or_username.short_description = 'Display Name'
