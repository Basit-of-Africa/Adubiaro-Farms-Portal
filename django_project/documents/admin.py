from django.contrib import admin
from .models import Document

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'farm', 'plot', 'category', 'visibility', 'uploaded_by', 'uploaded_at')
    list_filter = ('category', 'visibility', 'farm')
    search_fields = ('title', 'description', 'uploaded_by__username')
