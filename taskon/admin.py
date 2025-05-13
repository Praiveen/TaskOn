from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import (
    User, Company, Department, SubDepartment,
    Role, CompanyRole, Event, Meeting,
    Room, Notification,
    MeetingTemplate, AvailabilitySchedule, PersonalMeetingRequest,
    PersonalMeeting
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'fullName', 'company', 'department', 'is_staff', 'is_active')
    list_filter = ('is_staff', 'is_active', 'company', 'department')
    search_fields = ('email', 'fullName', 'firstName', 'lastName')
    ordering = ('email',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Персональная информация'), {'fields': ('fullName', 'firstName', 'lastName', 'phoneNumber')}),
        (_('Организационная информация'), {'fields': ('company', 'department', 'subDepartment', 'roles')}),
        (_('Права доступа'), {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        (_('Важные даты'), {'fields': ('last_login', 'createdAt', 'updatedAt')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'fullName', 'password1', 'password2'),
        }),
    )
    
    readonly_fields = ('createdAt', 'updatedAt')


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('companyName', 'address')
    search_fields = ('companyName',)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('departmentName', 'company')
    list_filter = ('company',)
    search_fields = ('departmentName',)


@admin.register(SubDepartment)
class SubDepartmentAdmin(admin.ModelAdmin):
    list_display = ('subdepartmentName', 'department')
    list_filter = ('department',)
    search_fields = ('subdepartmentName',)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)


@admin.register(CompanyRole)
class CompanyRoleAdmin(admin.ModelAdmin):
    list_display = ('roleName', 'company')
    list_filter = ('company',)
    search_fields = ('roleName',)


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('roomName', 'capacity')
    search_fields = ('roomName',)


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'startTime', 'endTime', 'status', 'createdBy')
    list_filter = ('status', 'createdBy')
    search_fields = ('title', 'description')
    date_hierarchy = 'startTime'
    filter_horizontal = ('participants',)


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = ('topic', 'startTime', 'endTime', 'room', 'organizer')
    list_filter = ('room', 'organizer')
    search_fields = ('topic', 'agenda')
    date_hierarchy = 'startTime'
    filter_horizontal = ('participants',)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'sender', 'receiver', 'sendDate', 'isCompleted')
    list_filter = ('isCompleted', 'sendDate')
    search_fields = ('title', 'message')
    date_hierarchy = 'sendDate'


@admin.register(MeetingTemplate)
class MeetingTemplateAdmin(admin.ModelAdmin):
    list_display = ('templateId', 'title', 'owner', 'duration', 'isActive', 'createdAt')
    list_filter = ('isActive', 'createdAt')
    search_fields = ('title', 'description', 'owner__email')


@admin.register(AvailabilitySchedule)
class AvailabilityScheduleAdmin(admin.ModelAdmin):
    list_display = ('scheduleId', 'template', 'dayOfWeek', 'startTime', 'endTime')
    list_filter = ('dayOfWeek', 'template')


@admin.register(PersonalMeetingRequest)
class PersonalMeetingRequestAdmin(admin.ModelAdmin):
    list_display = ('requestId', 'template', 'organizer', 'invitee', 'status', 'createdAt')
    list_filter = ('status', 'createdAt')
    search_fields = ('organizer__email', 'invitee__email', 'template__title')


@admin.register(PersonalMeeting)
class PersonalMeetingAdmin(admin.ModelAdmin):
    list_display = ('meetingId', 'get_title', 'get_organizer', 'get_invitee', 'startTime', 'endTime', 'status')
    list_filter = ('status', 'startTime')
    search_fields = ('request__template__title', 'request__organizer__email', 'request__invitee__email')
    
    def get_title(self, obj):
        return obj.request.template.title
    get_title.short_description = 'Название'
    
    def get_organizer(self, obj):
        return obj.request.organizer
    get_organizer.short_description = 'Организатор'
    
    def get_invitee(self, obj):
        return obj.request.invitee
    get_invitee.short_description = 'Приглашенный' 