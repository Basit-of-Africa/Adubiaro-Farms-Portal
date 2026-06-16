from django.contrib import admin
from .models import Farm, FarmPlot, InvestorPlot, FarmManagerAssignment

class FarmPlotInline(admin.TabularInline):
    model = FarmPlot
    extra = 1

class FarmManagerAssignmentInline(admin.TabularInline):
    model = FarmManagerAssignment
    extra = 1

@admin.register(Farm)
class FarmAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'state', 'total_plots', 'total_hectares', 'is_active')
    list_filter = ('state', 'is_active')
    search_fields = ('name', 'location')
    inlines = [FarmPlotInline, FarmManagerAssignmentInline]

@admin.register(FarmPlot)
class FarmPlotAdmin(admin.ModelAdmin):
    list_display = ('plot_number', 'farm', 'size_hectares', 'crop_type', 'status')
    list_filter = ('status', 'farm', 'crop_type')
    search_fields = ('plot_number', 'crop_type')

@admin.register(InvestorPlot)
class InvestorPlotAdmin(admin.ModelAdmin):
    list_display = ('investor', 'plot', 'investment_amount', 'ownership_percentage', 'start_date', 'is_active')
    list_filter = ('is_active', 'plot__farm')
    search_fields = ('investor__username', 'investor__last_name', 'plot__plot_number')

@admin.register(FarmManagerAssignment)
class FarmManagerAssignmentAdmin(admin.ModelAdmin):
    list_display = ('manager', 'farm', 'assigned_date', 'is_active')
    list_filter = ('is_active', 'farm')
    search_fields = ('manager__username', 'farm__name')
