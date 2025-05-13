from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    User, Company, Department, SubDepartment,
    Role, CompanyRole, Event, Meeting,
    Room, Notification
)
from .serializers import (
    UserSerializer, UserCreateSerializer, CompanySerializer,
    DepartmentSerializer, SubDepartmentSerializer, RoleSerializer,
    CompanyRoleSerializer, EventSerializer, MeetingSerializer,
    RoomSerializer, NotificationSerializer
)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def login(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'error': 'Пожалуйста, укажите email и пароль'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(email=email, password=password)

        if not user:
            return Response(
                {'error': 'Неверные учетные данные'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)

        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        })


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def by_company(self, request):
        company_id = request.query_params.get('company_id')
        if not company_id:
            return Response(
                {'error': 'Параметр company_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        departments = Department.objects.filter(company_id=company_id)
        serializer = self.get_serializer(departments, many=True)
        return Response(serializer.data)


class SubDepartmentViewSet(viewsets.ModelViewSet):
    queryset = SubDepartment.objects.all()
    serializer_class = SubDepartmentSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def by_department(self, request):
        department_id = request.query_params.get('department_id')
        if not department_id:
            return Response(
                {'error': 'Параметр department_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        subdepartments = SubDepartment.objects.filter(
            department_id=department_id)
        serializer = self.get_serializer(subdepartments, many=True)
        return Response(serializer.data)


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]


class CompanyRoleViewSet(viewsets.ModelViewSet):
    queryset = CompanyRole.objects.all()
    serializer_class = CompanyRoleSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def by_company(self, request):
        company_id = request.query_params.get('company_id')
        if not company_id:
            return Response(
                {'error': 'Параметр company_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        company_roles = CompanyRole.objects.filter(company_id=company_id)
        serializer = self.get_serializer(company_roles, many=True)
        return Response(serializer.data)


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def my_events(self, request):
        events = Event.objects.filter(participants=request.user)
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def created_by_me(self, request):
        events = Event.objects.filter(created_by=request.user)
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_participant(self, request, pk=None):
        event = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response(
                {'error': 'Параметр user_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = get_object_or_404(User, id=user_id)
        event.participants.add(user)

        Notification.objects.create(
            title=f'Вы добавлены в событие: {event.title}',
            message=f'Вас добавили как участника события {event.title}, которое начнется {event.start_time}',
            sender=request.user,
            receiver=user
        )

        return Response({'status': 'Участник добавлен'})

    @action(detail=True, methods=['post'])
    def remove_participant(self, request, pk=None):
        event = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response(
                {'error': 'Параметр user_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = get_object_or_404(User, id=user_id)
        event.participants.remove(user)

        return Response({'status': 'Участник удален'})

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        event = self.get_object()
        new_status = request.data.get('status')

        if not new_status or new_status not in [Event.STATUS_PLANNED, Event.STATUS_COMPLETED, Event.STATUS_CANCELLED]:
            return Response(
                {'error': 'Некорректный статус'},
                status=status.HTTP_400_BAD_REQUEST
            )

        event.status = new_status
        event.save()

        return Response({'status': 'Статус обновлен'})


class MeetingViewSet(viewsets.ModelViewSet):
    queryset = Meeting.objects.all()
    serializer_class = MeetingSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)

    @action(detail=False, methods=['get'])
    def my_meetings(self, request):
        meetings = Meeting.objects.filter(participants=request.user)
        serializer = self.get_serializer(meetings, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def organized_by_me(self, request):
        meetings = Meeting.objects.filter(organizer=request.user)
        serializer = self.get_serializer(meetings, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_participant(self, request, pk=None):
        meeting = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response(
                {'error': 'Параметр user_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = get_object_or_404(User, id=user_id)
        meeting.participants.add(user)

        Notification.objects.create(
            title=f'Вы добавлены во встречу: {meeting.title}',
            message=f'Вас добавили как участника встречи {meeting.title}, которая начнется {meeting.start_time}',
            sender=request.user,
            receiver=user
        )

        return Response({'status': 'Участник добавлен'})

    @action(detail=True, methods=['post'])
    def remove_participant(self, request, pk=None):
        meeting = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response(
                {'error': 'Параметр user_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = get_object_or_404(User, id=user_id)
        meeting.participants.remove(user)

        return Response({'status': 'Участник удален'})


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(receiver=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()

        return Response({'status': 'Уведомление отмечено как прочитанное'})

    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        Notification.objects.filter(
            receiver=request.user, is_read=False).update(is_read=True)

        return Response({'status': 'Все уведомления отмечены как прочитанные'})

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)
