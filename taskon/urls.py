"""
URL configuration for taskon project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic.base import TemplateView

from . import views, auth_views, user_views, event_views, page_views
from .views import (
    UserViewSet, CompanyViewSet, DepartmentViewSet, SubDepartmentViewSet,
    RoleViewSet, CompanyRoleViewSet, EventViewSet, MeetingViewSet,
    RoomViewSet, NotificationViewSet
)
from .personal_meeting_views import (
    MeetingTemplateViewSet, AvailabilityScheduleViewSet,
    PersonalMeetingRequestViewSet, PersonalMeetingViewSet
)

# Маршруты для API (использующие DRF ViewSets)
router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'companies', CompanyViewSet)
router.register(r'departments', DepartmentViewSet)
router.register(r'subdepartments', SubDepartmentViewSet)
router.register(r'roles', RoleViewSet)
router.register(r'company-roles', CompanyRoleViewSet)
router.register(r'events', EventViewSet)
router.register(r'meetings', MeetingViewSet)
router.register(r'rooms', RoomViewSet)
router.register(r'notifications', NotificationViewSet, basename='notification')

# Маршруты для API личных встреч
router.register(r'personal-meeting-templates', MeetingTemplateViewSet, basename='personal-meeting-template')
router.register(r'availability-schedules', AvailabilityScheduleViewSet, basename='availability-schedule')
router.register(r'personal-meeting-requests', PersonalMeetingRequestViewSet, basename='personal-meeting-request')
router.register(r'personal-meetings', PersonalMeetingViewSet, basename='personal-meeting')

urlpatterns = [
    # Административная панель
    path('admin/', admin.site.urls),
    
    # API маршруты
    path('api/', include(router.urls)),
    
    # Аутентификация JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Аутентификация
    path('auth/signup/', auth_views.register, name='auth_signup'),
    path('auth/login/', auth_views.authenticate_user, name='auth_login'),
    path('auth/logout/', auth_views.logout_user, name='auth_logout'),
    
    # Пользователи
    path('users/userData/', user_views.user_data, name='user_data'),
    path('users/userData/update/', user_views.update_user_data, name='update_user_data'),
    path('users/set-preferred-mode/', user_views.set_preferred_mode, name='set_preferred_mode'),
    
    # События и встречи
    path('event/available-recipients/', event_views.available_recipients, name='available_recipients'),
    path('event/create-event/<str:type>/<int:id>/', event_views.create_event, name='create_event'),
    path('event/user-events/', event_views.user_events, name='user_events'),
    path('event/create-meeting/<str:type>/<int:id>/', event_views.create_meeting, name='create_meeting'),
    path('event/user-meetings/', event_views.user_meetings, name='user_meetings'),
    path('event/delete-event/<int:id>/', event_views.delete_event, name='delete_event'),
    path('event/delete-meeting/<int:id>/', event_views.delete_meeting, name='delete_meeting'),
    path('event/complete-event/<int:id>/', event_views.complete_event, name='complete_event'),
    path('event/complete-meeting/<int:id>/', event_views.complete_meeting, name='complete_meeting'),

    # API для Dashboard
    path('dashboard/companies/', user_views.get_companies, name='dashboard_companies'),
    path('dashboard/notifications/', user_views.get_notifications, name='dashboard_notifications'),
    path('dashboard/companies/request/', user_views.request_company, name='request_company'),
    path('dashboard/notifications/accept/<int:notification_id>/', user_views.accept_company_request, name='accept_company_request'),
    path('dashboard/notifications/reject/<int:notification_id>/', user_views.reject_company_request, name='reject_company_request'),
    path('dashboard/notifications/read/<int:notification_id>/', user_views.mark_notification_read, name='mark_notification_read'),
    path('dashboard/starter/createCompany/newcompany/', user_views.create_company_api, name='create_company_api'),
    
    # Управление отделами и подотделами
    path('dashboard/departments/create/', user_views.create_department, name='create_department'),
    path('department/create/', user_views.create_department, name='department_create'),
    path('department/list/', user_views.get_departments, name='department_list'),
    path('department/<int:department_id>/', user_views.get_department_data, name='department_get'),
    path('department/update/<int:department_id>/', user_views.update_department, name='department_update'),
    path('department/delete/<int:department_id>/', user_views.delete_department, name='department_delete'),
    path('department/users/', user_views.get_company_users, name='department_users'),
    path('dashboard/departments/', user_views.get_departments, name='get_departments'),
    path('dashboard/departments/delete/<int:department_id>/', user_views.delete_department, name='delete_department'),
    path('dashboard/departments/getdepatmentdata/<int:department_id>/', user_views.get_department_data, name='get_department_data'),
    path('dashboard/departments/update/<int:department_id>/', user_views.update_department, name='update_department'),
    
    # Управление подотделами
    path('dashboard/departments/subdepartments/create/', user_views.create_subdepartment, name='create_subdepartment'),
    path('dashboard/departments/<int:department_id>/subdepartments/', user_views.get_subdepartments, name='get_subdepartments'),
    path('dashboard/departments/<int:department_id>/available-managers/', user_views.get_available_subdepartment_managers, name='get_available_subdepartment_managers'),
    path('dashboard/departments/subdepartments/<int:subdepartment_id>/', user_views.get_subdepartment, name='get_subdepartment'),
    path('dashboard/departments/subdepartments/update/<int:subdepartment_id>/', user_views.update_subdepartment, name='update_subdepartment'),
    path('dashboard/departments/subdepartments/delete/<int:subdepartment_id>/', user_views.delete_subdepartment, name='delete_subdepartment'),
    
    # Управление сотрудниками отделов и подотделов
    path('dashboard/employees/available/<str:target_type>/<int:target_id>/', user_views.get_available_employees, name='get_available_employees'),
    path('dashboard/employees/assign/<str:target_type>/<int:target_id>/', user_views.assign_employees, name='assign_employees'),
    path('dashboard/employees/remove/<str:target_type>/<int:target_id>/', user_views.remove_employees, name='remove_employees'),
    path('dashboard/departments/<int:department_id>/employees/', user_views.get_department_employees, name='get_department_employees'),
    path('dashboard/subdepartments/<int:subdepartment_id>/employees/', user_views.get_subdepartment_employees, name='get_subdepartment_employees'),

    # Получение информации о текущем пользователе
    path('dashboard/current-user-department/', user_views.get_current_user_department, name='get_current_user_department'),
    path('dashboard/current-user-subdepartment/', user_views.get_current_user_subdepartment, name='get_current_user_subdepartment'),

    # Управление доступом
    path('dashboard/access/grant-full/<int:user_id>/', user_views.grant_full_access, name='grant_full_access'),
    path('dashboard/access/revoke-full/<int:user_id>/', user_views.revoke_full_access, name='revoke_full_access'),

    # Страницы
    path('', page_views.index, name='index'),
    path('login/', page_views.login_page, name='login'),
    path('register/', page_views.register_page, name='register'),
    path('profile/', page_views.profile, name='profile'),
    path('dashboard/starter/', page_views.dashboard_starter, name='dashboard_starter'),
    path('dashboard/starter/createCompany/', page_views.create_company, name='create_company'),
    path('dashboard/starter/create-company/', page_views.create_company, name='create_company_alt'),
    path('dashboard/', page_views.dashboard, name='dashboard'),
    path('personal-meetings/', page_views.personal_meetings, name='personal_meetings'),

    # пути для статических страниц
    path('terms/', TemplateView.as_view(template_name='terms.html'), name='terms'),
    path('privacy/', TemplateView.as_view(template_name='privacy.html'), name='privacy'),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
