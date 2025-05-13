from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseRedirect, JsonResponse
from django.utils import timezone
import json

from .models import User, Company, Role, Department, Event, Meeting, Notification


def index(request):
    """
    Отображает главную страницу
    """
    return render(request, 'index.html')


def login_page(request):
    """
    Отображает страницу входа
    """
    if request.user.is_authenticated:

        if not request.user.preferredMode:
            return redirect('dashboard_starter')

        if request.user.preferredMode == "PERSONAL":
            return redirect('personal_meetings')
        elif request.user.preferredMode == "CORPORATE" and request.user.company:
            return redirect('dashboard')
        elif request.user.company:
            return redirect('dashboard')
        else:
            return redirect('dashboard_starter')

    return render(request, 'login.html')


def register_page(request):
    """
    Отображает страницу регистрации
    """
    if request.user.is_authenticated:
        return redirect('dashboard')

    return render(request, 'register.html')


@login_required
def profile(request):
    """
    Отображает профиль пользователя - аналог PageController.userPageLoader
    """
    return render(request, 'profile.html')


@login_required
def dashboard_starter(request):
    """
    Отображает стартовую страницу дашборда
    """
    current_user = request.user

    if current_user.preferredMode:

        if current_user.preferredMode == User.MODE_PERSONAL:

            return redirect('personal_meetings')
        elif current_user.company:

            if current_user.preferredMode == User.MODE_CORPORATE:
                return redirect('dashboard')
            elif current_user.preferredMode == User.MODE_BOTH:

                return redirect('dashboard')

    companies = Company.objects.all()

    notifications = Notification.objects.filter(
        receiver=current_user,
        isCompleted=False
    ).order_by('-sendDate')[:10]

    context = {
        'companies': companies,
        'notifications': notifications
    }

    return render(request, 'starter.html', context)


@login_required
def create_company(request):
    """
    Отображает страницу создания компании и присоединения к существующим компаниям
    """
    current_user = request.user
    if current_user.company:
        return redirect('dashboard')

    companies = Company.objects.all()

    notifications = Notification.objects.filter(
        receiver=current_user,
        isCompleted=False
    ).order_by('-sendDate')[:10]

    context = {
        'companies': companies,
        'notifications': notifications
    }

    return render(request, 'create_company.html', context)


@login_required
def dashboard(request):
    """
    Отображает дашборд
    """
    current_user = request.user
    if not current_user.company:
        return redirect('dashboard_starter')

    company = None

    if current_user.has_role(Role.DIRECTOR):
        company = Company.objects.filter(director=current_user).first()

    else:
        company = current_user.company

    notifications = Notification.objects.filter(
        receiver=current_user,
        isCompleted=False
    ).order_by('-sendDate')[:10]

    now = timezone.now()
    current_events = Event.objects.filter(
        participants=current_user,
        status=Event.STATUS_PLANNED,
        endTime__gte=now
    ).order_by('startTime')

    past_events = Event.objects.filter(
        participants=current_user
    ).exclude(
        status=Event.STATUS_PLANNED,
        endTime__gte=now
    ).order_by('-startTime')

    current_meetings = Meeting.objects.filter(
        participants=current_user,
        status=Meeting.STATUS_PLANNED,
        endTime__gte=now
    ).order_by('startTime')

    past_meetings = Meeting.objects.filter(
        participants=current_user
    ).exclude(
        status=Meeting.STATUS_PLANNED,
        endTime__gte=now
    ).order_by('-startTime')

    departments = []
    if current_user.has_role(Role.DIRECTOR):
        departments = Department.objects.filter(company=company)

    company_users = User.objects.filter(company=company)

    user_roles = [role.name for role in request.user.roles.all()]

    user_roles_json = json.dumps(user_roles)

    context = {
        'user': current_user,
        'company': company,
        'notifications': notifications,
        'current_events': current_events,
        'past_events': past_events,
        'current_meetings': current_meetings,
        'past_meetings': past_meetings,
        'departments': departments,
        'company_users': company_users,
        'user_roles': user_roles_json
    }

    return render(request, 'dashboard.html', context)


@login_required
def personal_meetings(request):
    """
    Отображает страницу личных встреч
    """
    current_user = request.user

    notifications = Notification.objects.filter(
        receiver=current_user,
        isCompleted=False
    ).order_by('-sendDate')[:10]

    now = timezone.now()

    current_meetings = Meeting.objects.filter(
        participants=current_user,
        status=Meeting.STATUS_PLANNED,
        endTime__gte=now
    ).order_by('startTime')

    past_meetings = Meeting.objects.filter(
        participants=current_user
    ).exclude(
        status=Meeting.STATUS_PLANNED,
        endTime__gte=now
    ).order_by('-startTime')

    context = {
        'user': current_user,
        'notifications': notifications,
        'current_meetings': current_meetings,
        'past_meetings': past_meetings,
    }

    return render(request, 'personal_meetings.html', context)
