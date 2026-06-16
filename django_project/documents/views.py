from django.shortcuts import render, redirect, get_object_or_045
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.views import View
from django.http import FileResponse, Http404, HttpResponseForbidden
from farms.models import Farm, FarmManagerAssignment, InvestorPlot
from .models import Document
from .forms import DocumentUploadForm
import mimetypes

class UploadDocumentView(LoginRequiredMixin, UserPassesTestMixin, View):
    def test_func(self):
        return self.request.user.role in ['admin', 'farm_manager']

    def get_farm(self):
        return get_object_or_404(Farm, pk=self.kwargs.get('farm_id'))

    def has_permission(self, farm):
        if self.request.user.role == 'admin':
            return True
        return FarmManagerAssignment.objects.filter(
            manager=self.request.user,
            farm=farm,
            is_active=True
        ).exists()

    def get(self, request, farm_id):
        farm = self.get_farm()
        if not self.has_permission(farm):
            return render(request, '403.html', status=403)
            
        form = DocumentUploadForm(farm=farm)
        return render(request, 'documents/upload_document.html', {
            'form': form,
            'farm': farm
        })

    def post(self, request, farm_id):
        farm = self.get_farm()
        if not self.has_permission(farm):
            return render(request, '403.html', status=403)

        form = DocumentUploadForm(request.POST, request.FILES, farm=farm)
        if form.is_valid():
            document = form.save(commit=False)
            document.farm = farm
            document.uploaded_by = request.user
            document.save()
            return redirect('farms:farm_detail', pk=farm.id)

        return render(request, 'documents/upload_document.html', {
            'form': form,
            'farm': farm
        })


class DownloadDocumentView(LoginRequiredMixin, View):
    def get(self, request, pk):
        document = get_object_or_404(Document, pk=pk)
        user = request.user
        role = user.role
        
        authorized = False
        
        # 1. Admin see all records
        if role == 'admin':
            authorized = True
            
        # 2. Manager see assigned farm, but NO financials
        elif role == 'farm_manager':
            manages_farm = FarmManagerAssignment.objects.filter(
                manager=user,
                farm=document.farm,
                is_active=True
            ).exists()
            if manages_farm and document.category != 'financial':
                authorized = True
                
        # 3. Investor see farm-wide OR custom owned plots' docs
        elif role == 'investor':
            owns_farm_plot = InvestorPlot.objects.filter(
                investor=user,
                plot__farm=document.farm,
                is_active=True
            ).exists()
            
            if owns_farm_plot:
                if document.visibility == 'farm':
                    authorized = True
                elif document.visibility == 'plot' and document.plot:
                    owns_specific_plot = InvestorPlot.objects.filter(
                        investor=user,
                        plot=document.plot,
                        is_active=True
                    ).exists()
                    if owns_specific_plot:
                        authorized = True

        if not authorized:
            return HttpResponseForbidden("Access Denied — Restricted security boundary.")

        # Serve the file securely
        file_path = document.file.path
        try:
            mime_type, _ = mimetypes.guess_type(file_path)
            response = FileResponse(open(file_path, 'rb'), content_type=mime_type)
            response['Content-Disposition'] = f'attachment; filename="{document.file.name.split("/")[-1]}"'
            return response
        except FileNotFoundError:
            raise Http404("Document was not found on secure server.")
 Pint
