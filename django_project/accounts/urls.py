from django.urls import path
from .views import PortalLoginView, PortalLogoutView

app_name = 'accounts'

urlpatterns = [
    path('login/', PortalLoginView.as_view(), name='login'),
    path('logout/', PortalLogoutView.as_view(), name='logout'),
]
