from django.db import models
from django.conf import settings
from farms.models import Farm, FarmPlot

class DocumentCategory(models.TextChoices):
    CONTRACT = 'contract', 'Deed Contract'
    CERTIFICATE = 'certificate', 'Verification Certificate'
    REPORT = 'report', 'Operational Report'
    FINANCIAL = 'financial', 'Financial Statement'
    LEGAL = 'legal', 'Legal Audit Clearance'
    OTHER = 'other', 'Supplementary Material'

class DocumentVisibility(models.TextChoices):
    FARM = 'farm', 'Farm-wide (All Owners on Farm)'
    PLOT = 'plot', 'Plot Specific (Individual Owner Only)'

class Document(models.Model):
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='documents')
    plot = models.ForeignKey(FarmPlot, on_delete=models.CASCADE, related_name='documents', blank=True, null=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='secure_documents/')
    category = models.CharField(
        max_length=20,
        choices=DocumentCategory.choices,
        default=DocumentCategory.OTHER
    )
    visibility = models.CharField(
        max_length=20,
        choices=DocumentVisibility.choices,
        default=DocumentVisibility.FARM
    )
    description = models.TextField(blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.get_category_display()})"
