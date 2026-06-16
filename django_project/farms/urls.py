from django.urls import path
from .views import (
    DashboardRedirectView,
    AdminDashboardView,
    ManagerDashboardView,
    InvestorDashboardView,
    FarmDetailView
)

app_name = 'farms'

urlpatterns = [
    path('dashboard/', DashboardRedirectView.as_view(), name='dashboard_redirect'),
    path('dashboard/admin/', AdminDashboardView.as_view(), name='admin_dashboard'),
    path('dashboard/manager/', ManagerDashboardView.as_view(), name='manager_dashboard'),
    path('dashboard/investor/', InvestorDashboardView.as_view(), name='investor_dashboard'),
    path('farm/<int:pk>/', FarmDetailView.as_view(), name='farm_detail'),
]
