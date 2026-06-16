from django import forms
from django.contrib.auth.forms import AuthenticationForm
from .models import User

class PortalLoginForm(AuthenticationForm):
    username = forms.CharField(widget=forms.TextInput(attrs={
        'class': 'form-control rounded-xl p-3 bg-light border-0 focus:shadow-none',
        'placeholder': 'Enter your username ID'
    }))
    password = forms.CharField(widget=forms.PasswordInput(attrs={
        'class': 'form-control rounded-xl p-3 bg-light border-0 focus:shadow-none',
        'placeholder': 'Enter password passcode'
    }))
