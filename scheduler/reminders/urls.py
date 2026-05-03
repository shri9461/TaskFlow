from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health),
    path('check/', views.trigger_check),
]
