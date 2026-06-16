from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from django.conf import settings
from django.conf.urls.static import static

def root_redirect(request):
    return redirect('accounts:login')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', root_redirect, name='root_redirect'),
    path('accounts/', include('accounts.urls', namespace='accounts')),
    path('farms/', include('farms.urls', namespace='farms')),
    path('updates/', include('updates.urls', namespace='updates')),
    path('documents/', include('documents.urls', namespace='documents')),
    path('financials/', include('financials.urls', namespace='financials')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
