from rest_framework.decorators import api_view
from rest_framework.response import Response
from .scheduler import check_and_notify


@api_view(['GET'])
def health(request):
    return Response({'status': 'ok', 'service': 'django-scheduler'})


@api_view(['POST'])
def trigger_check(request):
    """Manually trigger a reminder check (for testing)."""
    check_and_notify()
    return Response({'message': 'Reminder check triggered'})
