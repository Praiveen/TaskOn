from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email обязателен')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        return self.create_user(email, password, **extra_fields)


class Company(models.Model):
    companyId = models.AutoField(primary_key=True)
    companyName = models.CharField(max_length=255)
    address = models.CharField(max_length=255, null=True, blank=True)
    director = models.OneToOneField(
        'User', on_delete=models.SET_NULL, null=True, blank=True, related_name='directed_company')

    class Meta:
        verbose_name = "Компания"
        verbose_name_plural = "Компании"

    def __str__(self):
        return self.companyName


class Department(models.Model):
    departmentId = models.AutoField(primary_key=True)
    departmentName = models.CharField(max_length=255)
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name='departments')
    manager = models.OneToOneField(
        'User', on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_department')

    class Meta:
        verbose_name = "Отдел"
        verbose_name_plural = "Отделы"

    def __str__(self):
        return self.departmentName


class SubDepartment(models.Model):
    subdepartmentId = models.AutoField(primary_key=True)
    subdepartmentName = models.CharField(max_length=255)
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name='subDepartments')
    manager = models.OneToOneField('User', on_delete=models.SET_NULL,
                                   null=True, blank=True, related_name='managed_subdepartment')

    class Meta:
        verbose_name = "Подотдел"
        verbose_name_plural = "Подотделы"

    def __str__(self):
        return self.subdepartmentName


class Role(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(null=True, blank=True)

    USER = "USER"
    DIRECTOR = "DIRECTOR"
    DEPARTMENT_MANAGER = "DEPARTMENT_MANAGER"
    SUBDEPARTMENT_MANAGER = "SUBDEPARTMENT_MANAGER"
    EMPLOYEE = "EMPLOYEE"
    FULL_ACCESS = "FULL_ACCESS"

    ROLE_DESCRIPTIONS = {
        USER: "Базовый пользователь системы",
        DIRECTOR: "Директор компании",
        DEPARTMENT_MANAGER: "Руководитель отдела",
        SUBDEPARTMENT_MANAGER: "Руководитель подотдела",
        EMPLOYEE: "Сотрудник компании",
        FULL_ACCESS: "Полный доступ к системе"
    }

    class Meta:
        verbose_name = "Роль"
        verbose_name_plural = "Роли"

    def __str__(self):
        return self.name


class CompanyRole(models.Model):
    roleId = models.AutoField(primary_key=True)
    roleName = models.CharField(max_length=50)
    description = models.TextField(null=True, blank=True)
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name='company_roles')

    class Meta:
        verbose_name = "Роль в компании"
        verbose_name_plural = "Роли в компании"

    def __str__(self):
        return f"{self.roleName} ({self.company.companyName})"


class User(AbstractUser):
    MODE_PERSONAL = 'PERSONAL'
    MODE_CORPORATE = 'CORPORATE'
    MODE_BOTH = 'BOTH'

    MODE_CHOICES = [
        (MODE_PERSONAL, 'Личный'),
        (MODE_CORPORATE, 'Корпоративный'),
        (MODE_BOTH, 'Оба раздела'),
    ]

    userId = models.AutoField(primary_key=True)
    username = None
    email = models.EmailField(unique=True)
    fullName = models.CharField(max_length=255)
    firstName = models.CharField(max_length=150)
    lastName = models.CharField(max_length=150)
    phoneNumber = models.CharField(max_length=20, null=True, blank=True)
    preferredMode = models.CharField(
        max_length=10, choices=MODE_CHOICES, null=True, blank=True)

    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    subDepartment = models.ForeignKey(
        SubDepartment, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    company = models.ForeignKey(
        Company, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')

    roles = models.ManyToManyField(Role, related_name='users')
    companyRoles = models.ManyToManyField(CompanyRole, related_name='users')

    createdAt = models.DateTimeField(default=timezone.now)
    updatedAt = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['fullName']

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"

    def __str__(self):
        return self.email

    def has_role(self, role_name):
        return self.roles.filter(name=role_name).exists()

    @property
    def has_role_in_list(self):
        """Возвращает первую роль из списка возможных ролей для проверки в шаблоне"""
        priority_roles = [Role.DIRECTOR, Role.DEPARTMENT_MANAGER,
                          Role.SUBDEPARTMENT_MANAGER, Role.EMPLOYEE, Role.USER]
        for role in priority_roles:
            if self.has_role(role):
                return role
        return None

    @property
    def id(self):
        return self.userId


class Room(models.Model):
    roomId = models.AutoField(primary_key=True)
    roomName = models.CharField(max_length=255)
    capacity = models.IntegerField()
    location = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        verbose_name = "Комната"
        verbose_name_plural = "Комнаты"

    def __str__(self):
        return self.roomName


class Event(models.Model):
    eventId = models.AutoField(primary_key=True)

    STATUS_PLANNED = "PLANNED"
    STATUS_COMPLETED = "COMPLETED"
    STATUS_CANCELLED = "CANCELLED"

    STATUS_CHOICES = [
        (STATUS_PLANNED, "Запланировано"),
        (STATUS_COMPLETED, "Завершено"),
        (STATUS_CANCELLED, "Отменено"),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    startTime = models.DateTimeField()
    endTime = models.DateTimeField()
    location = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PLANNED)

    createdBy = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='created_events')
    participants = models.ManyToManyField(
        User, related_name='participatingEvents')

    class Meta:
        verbose_name = "Событие"
        verbose_name_plural = "События"

    def __str__(self):
        return self.title

    def isCompleted(self):
        return self.status == self.STATUS_COMPLETED

    def isPlanned(self):
        return self.status == self.STATUS_PLANNED

    def isCancelled(self):
        return self.status == self.STATUS_CANCELLED


class Meeting(models.Model):
    meetingId = models.AutoField(primary_key=True)

    STATUS_PLANNED = "PLANNED"
    STATUS_COMPLETED = "COMPLETED"
    STATUS_CANCELLED = "CANCELLED"

    STATUS_CHOICES = [
        (STATUS_PLANNED, "Запланировано"),
        (STATUS_COMPLETED, "Завершено"),
        (STATUS_CANCELLED, "Отменено"),
    ]

    topic = models.CharField(max_length=255)
    agenda = models.TextField(null=True, blank=True)
    startTime = models.DateTimeField()
    endTime = models.DateTimeField()
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PLANNED)
    room = models.ForeignKey(
        Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='meetings')
    location = models.CharField(max_length=255, null=True, blank=True)

    organizer = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='organized_meetings')
    participants = models.ManyToManyField(User, related_name='meetings')

    class Meta:
        verbose_name = "Встреча"
        verbose_name_plural = "Встречи"

    def __str__(self):
        return self.topic

    def isCompleted(self):
        return self.status == self.STATUS_COMPLETED

    def isPlanned(self):
        return self.status == self.STATUS_PLANNED

    def isCancelled(self):
        return self.status == self.STATUS_CANCELLED


class Notification(models.Model):
    notificationId = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255, null=True, blank=True)
    message = models.TextField()
    type = models.CharField(max_length=50, null=True, blank=True)
    sendDate = models.DateTimeField(default=timezone.now)
    isCompleted = models.BooleanField(default=False)

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    sender = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='sentNotifications')
    receiver = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='receivedNotifications')

    class Meta:
        verbose_name = "Уведомление"
        verbose_name_plural = "Уведомления"

    def __str__(self):
        return self.title or self.message[:50]


class MeetingTemplate(models.Model):
    templateId = models.AutoField(primary_key=True)
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='meeting_templates')
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    duration = models.IntegerField(help_text="Длительность встречи в минутах")
    location = models.CharField(max_length=255, null=True, blank=True)
    isActive = models.BooleanField(default=True)
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Шаблон встречи"
        verbose_name_plural = "Шаблоны встреч"

    def __str__(self):
        return f"{self.title} ({self.duration} мин.)"


class AvailabilitySchedule(models.Model):
    scheduleId = models.AutoField(primary_key=True)
    template = models.ForeignKey(
        MeetingTemplate, on_delete=models.CASCADE, related_name='availability_schedules')
    dayOfWeek = models.IntegerField(
        help_text="День недели (0-6, где 0 - понедельник)")
    startTime = models.TimeField()
    endTime = models.TimeField()

    class Meta:
        verbose_name = "Расписание доступности"
        verbose_name_plural = "Расписания доступности"
        unique_together = ('template', 'dayOfWeek', 'startTime', 'endTime')

    def __str__(self):
        days = ["Понедельник", "Вторник", "Среда",
                "Четверг", "Пятница", "Суббота", "Воскресенье"]
        return f"{days[self.dayOfWeek]}: {self.startTime} - {self.endTime}"


class PersonalMeetingRequest(models.Model):
    requestId = models.AutoField(primary_key=True)

    STATUS_PENDING = "PENDING"
    STATUS_CONFIRMED = "CONFIRMED"
    STATUS_CANCELLED = "CANCELLED"
    STATUS_EXPIRED = "EXPIRED"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Ожидает подтверждения"),
        (STATUS_CONFIRMED, "Подтверждено"),
        (STATUS_CANCELLED, "Отменено"),
        (STATUS_EXPIRED, "Истек срок")
    ]

    template = models.ForeignKey(
        MeetingTemplate, on_delete=models.CASCADE, related_name='meeting_requests')
    organizer = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='sent_meeting_requests')
    invitee = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='received_meeting_requests')
    message = models.TextField(
        null=True, blank=True, help_text="Персональное сообщение от организатора")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    createdAt = models.DateTimeField(auto_now_add=True)
    expiryDate = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Запрос на личную встречу"
        verbose_name_plural = "Запросы на личные встречи"

    def __str__(self):
        return f"Запрос на встречу от {self.organizer} для {self.invitee}"

    def is_expired(self):
        if self.expiryDate and timezone.now() > self.expiryDate:
            return True
        return False


class PersonalMeeting(models.Model):
    meetingId = models.AutoField(primary_key=True)

    STATUS_SCHEDULED = "SCHEDULED"
    STATUS_COMPLETED = "COMPLETED"
    STATUS_CANCELLED = "CANCELLED"

    STATUS_CHOICES = [
        (STATUS_SCHEDULED, "Запланирована"),
        (STATUS_COMPLETED, "Завершена"),
        (STATUS_CANCELLED, "Отменена")
    ]

    request = models.OneToOneField(
        PersonalMeetingRequest, on_delete=models.CASCADE, related_name='personal_meeting')
    startTime = models.DateTimeField()
    endTime = models.DateTimeField()
    notes = models.TextField(null=True, blank=True,
                             help_text="Заметки после встречи")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_SCHEDULED)

    class Meta:
        verbose_name = "Личная встреча"
        verbose_name_plural = "Личные встречи"

    def __str__(self):
        return f"Личная встреча: {self.request.template.title} ({self.startTime.strftime('%d.%m.%Y %H:%M')})"

    def is_upcoming(self):
        return self.status == self.STATUS_SCHEDULED and timezone.now() < self.startTime

    def is_past(self):
        return self.status == self.STATUS_COMPLETED or timezone.now() > self.endTime
