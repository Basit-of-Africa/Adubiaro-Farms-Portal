from django.urls import path
from .views import InvestorFinancialsView

app_name = 'financials'

urlpatterns = [
    path('my/', InvestorFinancialsView.as_view(), name='my_financials'),
]
