from django.contrib import admin
from .models import FarmUpdate, UpdatePhoto

class UpdatePhotoInline(admin.TabularInline):
    model = UpdatePhoto
    extra = 1

@admin.register(FarmUpdate)
class FarmUpdateAdmin(admin.ModelAdmin):
    list_display = ('title', 'farm', 'posted_by', 'update_type', 'is_published', 'created_at')
    list_filter = ('update_type', 'is_published', 'farm')
    search_fields = ('title', 'body', 'posted_by__username')
    inlines = [UpdatePhotoInline]
