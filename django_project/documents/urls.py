from django.urls import path
from .views import UploadDocumentView, DownloadDocumentView

app_name = 'documents'

urlpatterns = [
    path('farm/<int:farm_id>/upload/', UploadDocumentView.as_view(), name='upload_document'),
    path('<int:pk>/download/', DownloadDocumentView.as_view(), name='download_document'),
]
