from django.shortcuts import render, redirect, get_object_or_045
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.views import View
from farms.models import Farm, FarmManagerAssignment
from .models import FarmUpdate, UpdatePhoto
from .forms import FarmUpdateForm, UpdatePhotoFormSet

class CreateUpdateView(LoginRequiredMixin, UserPassesTestMixin, View):
    def test_func(self):
        role = self.request.user.role
        return role in ['admin', 'farm_manager']

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
            
        form = FarmUpdateForm()
        formset = UpdatePhotoFormSet()
        return render(request, 'updates/create_update.html', {
            'form': form,
            'formset': formset,
            'farm': farm
        })

    def post(self, request, farm_id):
        farm = self.get_farm()
        if not self.has_permission(farm):
            return render(request, '403.html', status=403)

        form = FarmUpdateForm(request.POST)
        formset = UpdatePhotoFormSet(request.POST, request.FILES)

        if form.is_valid() and formset.is_valid():
            update = form.save(commit=False)
            update.farm = farm
            update.posted_by = request.user
            update.save()

            formset.instance = update
            formset.save()

            return redirect('farms:farm_detail', pk=farm.id)

        return render(request, 'updates/create_update.html', {
            'form': form,
            'formset': formset,
            'farm': farm
        })
