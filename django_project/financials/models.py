from django.db import models
from django.conf import settings
from farms.models import FarmPlot
from accounts.models import UserRole

class FinancialStatus(models.TextChoices):
    PENDING = 'pending', 'Pending Statement'
    PAID = 'paid', 'ROI Paid Out'
    PARTIAL = 'partial', 'Partial Settlement'
    OVERDUE = 'overdue', 'Overdue Balance'

class FinancialSummary(models.Model):
    plot = models.ForeignKey(FarmPlot, on_delete=models.CASCADE, related_name='financials')
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    period = models.CharField(max_length=50) # Q1/Q2/Q3/Q4/annual
    year = models.IntegerField()
    roi_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    payout_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payout_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=FinancialStatus.choices,
        default=FinancialStatus.PENDING
    )
    notes = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('plot', 'period', 'year')

    def __str__(self):
        return f"{self.period} {self.year} — Plot {self.plot.plot_number}"
