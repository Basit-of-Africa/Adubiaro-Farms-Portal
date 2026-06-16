from django.shortcuts import render
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.views import View
from farms.models import InvestorPlot
from .models import FinancialSummary

class InvestorFinancialsView(LoginRequiredMixin, UserPassesTestMixin, View):
    # Enforced at query query-level of validation criteria:
    # 1. Blocks manager completely
    # 2. Investor can see ONLY their owned plot statements
    def test_func(self):
        return self.request.user.role in ['admin', 'investor']

    def get(self, request):
        user = request.user
        role = user.role
        
        if role == 'admin':
            summaries = FinancialSummary.objects.all().order_by('-year', '-period')
        else:
            # Get investor plot allocations
            owned_plot_ids = InvestorPlot.objects.filter(
                investor=user,
                is_active=True
            ).values_list('plot_id', flat=True)
            
            summaries = FinancialSummary.objects.filter(
                plot_id__in=owned_plot_ids
            ).order_by('-year', '-period')

        context = {
            'summaries': summaries,
        }
        return render(request, 'financials/investor_financials.html', context)
