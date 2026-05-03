from django.urls import path, include

urlpatterns = [
    path('api/reminders/', include('reminders.urls')),
]
