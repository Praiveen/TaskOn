from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import render


class IndexView(TemplateView):
    template_name = 'index.html'
    
    def get(self, request, *args, **kwargs):
        return render(request, self.template_name) 