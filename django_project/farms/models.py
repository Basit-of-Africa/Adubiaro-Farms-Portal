from django.db import models
from django.conf import settings

class PlotStatus(models.TextChoices):
    AVAILABLE = 'available', 'Available'
    ACTIVE = 'active', 'Active'
    HARVESTING = 'harvesting', 'Harvesting'
    DORMANT = 'dormant', 'Dormant'

class Farm(models.Model):
    name = models.CharField(max_length=200)
    location = models.CharField(max_length=200)
    state = models.CharField(max_length=100)
    total_plots = models.IntegerField(default=0)
    total_hectares = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    cover_image = models.ImageField(upload_to='farms/', blank=True, null=True)
    date_established = models.DateField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class FarmPlot(models.Model):
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='plots')
    plot_number = models.CharField(max_length=50)
    size_hectares = models.DecimalField(max_digits=5, decimal_places=2)
    crop_type = models.CharField(max_length=150, default='Oil Palm')
    status = models.CharField(
        max_length=20,
        choices=PlotStatus.choices,
        default=PlotStatus.AVAILABLE
    )

    def __str__(self):
        return f"{self.farm.name} — Plot {self.plot_number}"

class InvestorPlot(models.Model):
    investor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='investments'
    )
    plot = models.ForeignKey(FarmPlot, on_delete=models.CASCADE, related_name='owners')
    investment_amount = models.DecimalField(max_digits=15, decimal_places=2)
    ownership_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    start_date = models.DateField()
    contract_ref = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.investor.username} — Plot {self.plot.plot_number}"

class FarmManagerAssignment(models.Model):
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='managers')
    assigned_date = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('manager', 'farm')

    def __str__(self):
        return f"{self.manager.username} assigned to {self.farm.name}"
