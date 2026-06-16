from django import forms
from .models import Document, FarmPlot

class DocumentUploadForm(forms.ModelForm):
    class Meta:
        model = Document
        fields = ['title', 'category', 'visibility', 'plot', 'description', 'file']
        widgets = {
            'title': forms.TextInput(attrs={'class': 'form-control rounded-xl p-3'}),
            'category': forms.Select(attrs={'class': 'form-select rounded-xl p-3'}),
            'visibility': forms.Select(attrs={'class': 'form-select rounded-xl p-3'}),
            'plot': forms.Select(attrs={'class': 'form-select rounded-xl p-3'}),
            'description': forms.Textarea(attrs={'class': 'form-control rounded-xl p-3', 'rows': 2}),
            'file': forms.FileInput(attrs={'class': 'form-control rounded-xl'}),
        }

    def __init__(self, *args, **kwargs):
        # Retrieve target farm limits
        farm = kwargs.pop('farm', None)
        super().__init__(*args, **kwargs)
        if farm:
            self.fields['plot'].queryset = FarmPlot.objects.filter(farm=farm)
            self.fields['plot'].label = "Associated Specific Plot (Optional if Farm-wide)"
            self.fields['plot'].empty_label = "-- Farm-wide Visibility --"
