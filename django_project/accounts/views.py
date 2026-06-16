from django.shortcuts import render, redirect
from django.contrib.auth import login as auth_login, logout as auth_logout
from django.contrib.auth.views import LoginView
from django.urls import reverse_lazy
from django.views import View
from .forms import PortalLoginForm

class PortalLoginView(LoginView):
    authentication_form = PortalLoginForm
    template_name = 'accounts/login.html'

    def get_success_url(self):
        return reverse_lazy('farms:dashboard_redirect')

class PortalLogoutView(View):
    def get(self, request):
        auth_logout(request)
        return redirect('accounts:login')

    def post(self, request):
        auth_logout(request)
        return redirect('accounts:login')
