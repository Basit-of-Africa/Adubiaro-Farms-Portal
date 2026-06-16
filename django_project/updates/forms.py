from django import forms
from django.forms import inlineformset_factory
from .models import FarmUpdate, UpdatePhoto

class FarmUpdateForm(forms.ModelForm):
    class Meta:
        model = FarmUpdate
        fields = ['title', 'body', 'update_type']
        widgets = {
            'title': forms.TextInput(attrs={'class': 'form-control rounded-xl p-3'}),
            'body': forms.Textarea(attrs={'class': 'form-control rounded-xl p-3', 'rows': 4}),
            'update_type': forms.Select(attrs={'class': 'form-select rounded-xl p-3'}),
        }

UpdatePhotoFormSet = inlineformset_factory(
    FarmUpdate,
    UpdatePhoto,
    fields=['image', 'caption'],
    extra=2,
    can_delete=False,
    widgets={
        'image': forms.FileInput(attrs={'class': 'form-control rounded-xl'}),
        'caption': forms.TextInput(attrs={'class': 'form-control rounded-xl', 'placeholder': 'Optional brief caption'}),
    }
)
