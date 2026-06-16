from django.contrib import admin
from .models import FinancialSummary

@admin.register(FinancialSummary)
class FinancialSummaryAdmin(admin.ModelAdmin):
    list_display = ('plot', 'period', 'year', 'roi_percentage', 'payout_amount', 'payout_date', 'status')
    list_filter = ('status', 'period', 'year', 'plot__farm')
    search_fields = ('plot__plot_number', 'notes')
