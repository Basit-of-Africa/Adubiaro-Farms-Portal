from django.shortcuts import render, get_object_or_045, redirect
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.views import View
from django.contrib.auth import get_user_model
from .models import Farm, FarmPlot, InvestorPlot, FarmManagerAssignment
from updates.models import FarmUpdate
from documents.models import Document
from financials.models import FinancialSummary

User = get_user_model()

class DashboardRedirectView(LoginRequiredMixin, View):
    def get(self, request):
        role = request.user.role
        if role == 'admin':
            return redirect('farms:admin_dashboard')
        elif role == 'farm_manager':
            return redirect('farms:manager_dashboard')
        elif role == 'investor':
            return redirect('farms:investor_dashboard')
        return redirect('accounts:login')

class AdminDashboardView(LoginRequiredMixin, UserPassesTestMixin, View):
    def test_func(self):
        return self.request.user.role == 'admin'

    def get(self, request):
        farms = Farm.objects.filter(is_active=True)
        investors = User.objects.filter(role='investor')
        managers = User.objects.filter(role='farm_manager')
        plots = FarmPlot.objects.all()
        
        context = {
            'farms': farms,
            'total_investors_count': investors.count(),
            'total_managers_count': managers.count(),
            'total_farms_count': farms.count(),
            'total_plots_count': plots.count(),
        }
        return render(request, 'farms/admin_dashboard.html', context)

class ManagerDashboardView(LoginRequiredMixin, UserPassesTestMixin, View):
    def test_func(self):
        return self.request.user.role == 'farm_manager'

    def get(self, request):
        assigned_farm_ids = FarmManagerAssignment.objects.filter(
            manager=request.user,
            is_active=True
        ).values_list('farm_id', flat=True)
        
        farms = Farm.objects.filter(id__in=assigned_farm_ids)
        
        context = {
            'farms': farms,
        }
        return render(request, 'farms/manager_dashboard.html', context)

class InvestorDashboardView(LoginRequiredMixin, UserPassesTestMixin, View):
    def test_func(self):
        return self.request.user.role == 'investor'

    def get(self, request):
        investments = InvestorPlot.objects.filter(investor=request.user, is_active=True)
        owned_farm_ids = investments.values_list('plot__farm_id', flat=True).distinct()
        farms = Farm.objects.filter(id__in=owned_farm_ids)
        
        total_investment = sum(inv.investment_amount for inv in investments)
        total_hectares = sum(inv.plot.size_hectares for inv in investments)

        context = {
            'farms': farms,
            'investments': investments,
            'total_investment': total_investment,
            'total_hectares': total_hectares,
        }
        return render(request, 'farms/investor_dashboard.html', context)

class FarmDetailView(LoginRequiredMixin, View):
    def get(self, request, pk):
        farm = get_object_or_404(Farm, pk=pk)
        
        # Security permission check: user must belong to this farm
        role = request.user.role
        authorized = False
        
        if role == 'admin':
            authorized = True
        elif role == 'farm_manager':
            authorized = FarmManagerAssignment.objects.filter(
                manager=request.user,
                farm=farm,
                is_active=True
            ).exists()
        elif role == 'investor':
            authorized = InvestorPlot.objects.filter(
                investor=request.user,
                plot__farm=farm,
                is_active=True
            ).exists()
            
        if not authorized:
            return render(request, '403.html', status=403)
            
        # Get appropriate assets
        plots = FarmPlot.objects.filter(farm=farm)
        updates = FarmUpdate.objects.filter(farm=farm, is_published=True).order_by('-created_at')
        
        # Filter documents based on role
        if role == 'admin':
            documents = Document.objects.filter(farm=farm)
        elif role == 'farm_manager':
            # Manager cannot see financials
            documents = Document.objects.filter(farm=farm).exclude(category='financial')
        elif role == 'investor':
            # Investors see farm-wide or their specific plot's docs
            owned_plot_ids = InvestorPlot.objects.filter(
                investor=request.user,
                is_active=True
            ).values_list('plot_id', flat=True)
            
            documents = Document.objects.filter(farm=farm).filter(
                models.Q(visibility='farm') |
                (models.Q(visibility='plot') & models.Q(plot_id__in=owned_plot_ids))
            )

        context = {
            'farm': farm,
            'plots': plots,
            'updates': updates,
            'documents': documents,
        }
        return render(request, 'farms/farm_detail.html', context)
