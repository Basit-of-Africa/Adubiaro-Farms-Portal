from django.urls import path
from .views import CreateUpdateView

app_name = 'updates'

urlpatterns = [
    path('farm/<int:farm_id>/new/', CreateUpdateView.as_view(), name='create_update'),
]
