from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, timedelta

from .models import (
    User, MeetingTemplate, AvailabilitySchedule,
    PersonalMeetingRequest, PersonalMeeting, Notification
)
from .serializers import (
    MeetingTemplateSerializer, MeetingTemplateDetailSerializer,
    AvailabilityScheduleSerializer, PersonalMeetingRequestSerializer,
    PersonalMeetingRequestDetailSerializer, PersonalMeetingSerializer,
    PersonalMeetingDetailSerializer, UserSerializer
)


class MeetingTemplateViewSet(viewsets.ModelViewSet):
    """
    API для управления шаблонами личных встреч
    """
    serializer_class = MeetingTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Возвращает шаблоны встреч, созданные текущим пользователем
        """
        return MeetingTemplate.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        """
        Использует детальный сериализатор для retrieve действия
        """
        if self.action == 'retrieve':
            return MeetingTemplateDetailSerializer
        return MeetingTemplateSerializer

    def perform_create(self, serializer):
        """
        Создает шаблон встречи с текущим пользователем как владельцем
        """
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """
        Включает/выключает активность шаблона
        """
        template = self.get_object()
        template.isActive = not template.isActive
        template.save()

        return Response({
            'status': 'success',
            'isActive': template.isActive
        })


class AvailabilityScheduleViewSet(viewsets.ModelViewSet):
    """
    API для управления расписанием доступности
    """
    serializer_class = AvailabilityScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Возвращает расписание для шаблона, указанного в параметрах запроса
        """
        template_id = self.request.query_params.get('template')
        if template_id:
            template = get_object_or_404(
                MeetingTemplate, templateId=template_id, owner=self.request.user)
            return AvailabilitySchedule.objects.filter(template=template)

        return AvailabilitySchedule.objects.filter(template__owner=self.request.user)

    def perform_create(self, serializer):
        """
        Проверяет, что пользователь имеет право на создание расписания для указанного шаблона
        """
        template_id = serializer.validated_data.get('template').templateId
        template = get_object_or_404(MeetingTemplate, templateId=template_id)

        if template.owner != self.request.user:
            return Response(
                {'error': 'У вас нет прав на изменение этого шаблона'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer.save()


class PersonalMeetingRequestViewSet(viewsets.ModelViewSet):
    """
    API для управления запросами на личные встречи
    """
    serializer_class = PersonalMeetingRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Возвращает запросы на встречи, связанные с текущим пользователем
        """

        return PersonalMeetingRequest.objects.filter(
            Q(organizer=self.request.user) | Q(invitee=self.request.user)
        ).order_by('-createdAt')

    def get_serializer_class(self):
        """
        Использует детальный сериализатор для retrieve действия
        """
        if self.action == 'retrieve':
            return PersonalMeetingRequestDetailSerializer
        return PersonalMeetingRequestSerializer

    def perform_create(self, serializer):
        """
        Создает запрос на встречу с текущим пользователем как организатором
        """
        template = serializer.validated_data.get('template')
        if template.owner != self.request.user:
            return Response(
                {'error': 'Вы можете создавать запросы только для своих шаблонов'},
                status=status.HTTP_403_FORBIDDEN
            )

        invitee = serializer.validated_data.get('invitee')

        expiry_date = timezone.now() + timedelta(days=7)

        request_obj = serializer.save(
            organizer=self.request.user,
            expiryDate=expiry_date
        )

        Notification.objects.create(
            title=f'Приглашение на личную встречу: {template.title}',
            message=f'{self.request.user.firstName} {self.request.user.lastName} приглашает вас на личную встречу: {template.title}.',
            type='PERSONAL_MEETING_INVITATION',
            sender=self.request.user,
            receiver=invitee
        )

        return request_obj

    @action(detail=False, methods=['get'])
    def incoming(self, request):
        """
        Возвращает входящие запросы на встречи
        """
        queryset = PersonalMeetingRequest.objects.filter(
            invitee=request.user
        ).order_by('-createdAt')

        serializer = PersonalMeetingRequestDetailSerializer(
            queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def outgoing(self, request):
        """
        Возвращает исходящие запросы на встречи
        """
        queryset = PersonalMeetingRequest.objects.filter(
            organizer=request.user
        ).order_by('-createdAt')

        serializer = PersonalMeetingRequestDetailSerializer(
            queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Отменяет запрос на встречу
        """
        meeting_request = self.get_object()

        if meeting_request.organizer != request.user:
            return Response(
                {'error': 'Вы можете отменять только свои запросы'},
                status=status.HTTP_403_FORBIDDEN
            )

        if meeting_request.status != PersonalMeetingRequest.STATUS_PENDING:
            return Response(
                {'error': f'Нельзя отменить запрос в статусе {meeting_request.get_status_display()}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        meeting_request.status = PersonalMeetingRequest.STATUS_CANCELLED
        meeting_request.save()

        Notification.objects.create(
            title='Запрос на встречу отменен',
            message=f'Запрос на встречу "{meeting_request.template.title}" был отменен организатором.',
            type='PERSONAL_MEETING_CANCELLED',
            sender=request.user,
            receiver=meeting_request.invitee
        )

        return Response({'status': 'Запрос успешно отменен'})

    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """
        Отклоняет запрос на встречу
        """
        meeting_request = self.get_object()

        if meeting_request.invitee != request.user:
            return Response(
                {'error': 'Вы можете отклонять только запросы, адресованные вам'},
                status=status.HTTP_403_FORBIDDEN
            )

        if meeting_request.status != PersonalMeetingRequest.STATUS_PENDING:
            return Response(
                {'error': f'Нельзя отклонить запрос в статусе {meeting_request.get_status_display()}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        meeting_request.status = PersonalMeetingRequest.STATUS_DECLINED
        meeting_request.save()

        Notification.objects.create(
            title='Запрос на встречу отклонен',
            message=f'{request.user.firstName} {request.user.lastName} отклонил(а) запрос на встречу "{meeting_request.template.title}".',
            type='PERSONAL_MEETING_DECLINED',
            sender=request.user,
            receiver=meeting_request.organizer
        )

        return Response({'status': 'Запрос успешно отклонен'})

    @action(detail=True, methods=['get'])
    def available_slots(self, request, pk=None):
        """
        Возвращает доступные слоты времени для запроса на встречу
        """
        meeting_request = self.get_object()

        if meeting_request.status != PersonalMeetingRequest.STATUS_PENDING:
            return Response(
                {'error': f'Нельзя выбрать время для запроса в статусе {meeting_request.get_status_display()}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        template = meeting_request.template
        availabilities = AvailabilitySchedule.objects.filter(template=template)

        if not availabilities.exists():
            return Response(
                {'error': 'Для этого шаблона не настроено расписание доступности'},
                status=status.HTTP_400_BAD_REQUEST
            )

        available_slots = []
        now = timezone.now()

        for day_offset in range(14):
            day = now.date() + timedelta(days=day_offset)
            day_of_week = day.weekday()

            day_availabilities = availabilities.filter(dayOfWeek=day_of_week)

            for availability in day_availabilities:

                start_datetime = datetime.combine(day, availability.startTime)
                end_datetime = datetime.combine(day, availability.endTime)

                start_datetime = timezone.make_aware(start_datetime)
                end_datetime = timezone.make_aware(end_datetime)

                if start_datetime <= now:
                    continue

                current_start = start_datetime
                while current_start + timedelta(minutes=template.duration) <= end_datetime:
                    current_end = current_start + \
                        timedelta(minutes=template.duration)

                    organizer_meetings = PersonalMeeting.objects.filter(
                        Q(request__organizer=meeting_request.organizer) | Q(
                            request__invitee=meeting_request.organizer),
                        startTime__lt=current_end,
                        endTime__gt=current_start,
                        status=PersonalMeeting.STATUS_SCHEDULED
                    )

                    invitee_meetings = PersonalMeeting.objects.filter(
                        Q(request__organizer=meeting_request.invitee) | Q(
                            request__invitee=meeting_request.invitee),
                        startTime__lt=current_end,
                        endTime__gt=current_start,
                        status=PersonalMeeting.STATUS_SCHEDULED
                    )

                    if not organizer_meetings.exists() and not invitee_meetings.exists():
                        available_slots.append({
                            'start': current_start.isoformat(),
                            'end': current_end.isoformat(),
                            'date': day.isoformat(),
                            'dayOfWeek': day_of_week,
                            'formattedDate': day.strftime('%d.%m.%Y'),
                            'startTime': current_start.strftime('%H:%M'),
                            'endTime': current_end.strftime('%H:%M')
                        })

                    current_start += timedelta(minutes=template.duration)

        return Response(available_slots)


class PersonalMeetingViewSet(viewsets.ModelViewSet):
    """
    API для управления личными встречами
    """
    serializer_class = PersonalMeetingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Возвращает личные встречи, связанные с текущим пользователем
        """
        return PersonalMeeting.objects.filter(
            Q(request__organizer=self.request.user) | Q(
                request__invitee=self.request.user)
        ).order_by('startTime')

    def get_serializer_class(self):
        """
        Использует детальный сериализатор для retrieve действия
        """
        if self.action == 'retrieve':
            return PersonalMeetingDetailSerializer
        return PersonalMeetingSerializer

    @action(detail=False, methods=['post'])
    def confirm(self, request):
        """
        Подтверждает запрос на встречу и создает личную встречу
        """
        request_id = request.data.get('request_id')
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')

        if not all([request_id, start_time, end_time]):
            return Response(
                {'error': 'Необходимо указать request_id, start_time и end_time'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            meeting_request = PersonalMeetingRequest.objects.get(
                requestId=request_id)
        except PersonalMeetingRequest.DoesNotExist:
            return Response(
                {'error': 'Запрос на встречу не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        if meeting_request.invitee != request.user:
            return Response(
                {'error': 'Вы не можете подтвердить этот запрос'},
                status=status.HTTP_403_FORBIDDEN
            )

        if meeting_request.status != PersonalMeetingRequest.STATUS_PENDING:
            return Response(
                {'error': f'Нельзя подтвердить запрос в статусе {meeting_request.get_status_display()}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:

            start_datetime = datetime.fromisoformat(start_time)
            end_datetime = datetime.fromisoformat(end_time)
        except ValueError:
            return Response(
                {'error': 'Некорректный формат времени'},
                status=status.HTTP_400_BAD_REQUEST
            )

        organizer_meetings = PersonalMeeting.objects.filter(
            Q(request__organizer=meeting_request.organizer) | Q(
                request__invitee=meeting_request.organizer),
            startTime__lt=end_datetime,
            endTime__gt=start_datetime,
            status=PersonalMeeting.STATUS_SCHEDULED
        )

        invitee_meetings = PersonalMeeting.objects.filter(
            Q(request__organizer=meeting_request.invitee) | Q(
                request__invitee=meeting_request.invitee),
            startTime__lt=end_datetime,
            endTime__gt=start_datetime,
            status=PersonalMeeting.STATUS_SCHEDULED
        )

        if organizer_meetings.exists() or invitee_meetings.exists():
            return Response(
                {'error': 'Выбранное время уже занято'},
                status=status.HTTP_400_BAD_REQUEST
            )

        meeting_request.status = PersonalMeetingRequest.STATUS_CONFIRMED
        meeting_request.save()

        personal_meeting = PersonalMeeting.objects.create(
            request=meeting_request,
            startTime=start_datetime,
            endTime=end_datetime,
            status=PersonalMeeting.STATUS_SCHEDULED
        )

        Notification.objects.create(
            title='Запрос на встречу подтвержден',
            message=f'{meeting_request.invitee.firstName} {meeting_request.invitee.lastName} подтвердил(а) вашу встречу "{meeting_request.template.title}" на {start_datetime.strftime("%d.%m.%Y %H:%M")}.',
            type='PERSONAL_MEETING_CONFIRMED',
            sender=request.user,
            receiver=meeting_request.organizer
        )

        serializer = PersonalMeetingDetailSerializer(personal_meeting)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Отменяет личную встречу
        """
        personal_meeting = self.get_object()

        if personal_meeting.status == PersonalMeeting.STATUS_COMPLETED:
            return Response(
                {'error': 'Нельзя отменить завершенную встречу'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if (personal_meeting.request.organizer != request.user and
                personal_meeting.request.invitee != request.user):
            return Response(
                {'error': 'Вы не являетесь участником этой встречи'},
                status=status.HTTP_403_FORBIDDEN
            )

        personal_meeting.status = PersonalMeeting.STATUS_CANCELLED
        personal_meeting.save()

        if personal_meeting.request.organizer == request.user:
            recipient = personal_meeting.request.invitee
            sender_name = f"{personal_meeting.request.organizer.firstName} {personal_meeting.request.organizer.lastName}"
        else:
            recipient = personal_meeting.request.organizer
            sender_name = f"{personal_meeting.request.invitee.firstName} {personal_meeting.request.invitee.lastName}"

        Notification.objects.create(
            title='Встреча отменена',
            message=f'{sender_name} отменил(а) встречу "{personal_meeting.request.template.title}" на {personal_meeting.startTime.strftime("%d.%m.%Y %H:%M")}.',
            type='PERSONAL_MEETING_CANCELLED',
            sender=request.user,
            receiver=recipient
        )

        return Response({'status': 'Встреча успешно отменена'})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Отмечает личную встречу как завершенную
        """
        personal_meeting = self.get_object()

        if personal_meeting.status == PersonalMeeting.STATUS_CANCELLED:
            return Response(
                {'error': 'Нельзя завершить отмененную встречу'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if (personal_meeting.request.organizer != request.user and
                personal_meeting.request.invitee != request.user):
            return Response(
                {'error': 'Вы не являетесь участником этой встречи'},
                status=status.HTTP_403_FORBIDDEN
            )

        notes = request.data.get('notes')
        if notes:
            personal_meeting.notes = notes

        personal_meeting.status = PersonalMeeting.STATUS_COMPLETED
        personal_meeting.save()

        return Response({'status': 'Встреча успешно завершена'})

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """
        Возвращает предстоящие личные встречи
        """
        now = timezone.now()
        queryset = PersonalMeeting.objects.filter(
            Q(request__organizer=request.user) | Q(
                request__invitee=request.user),
            startTime__gt=now,
            status=PersonalMeeting.STATUS_SCHEDULED
        ).order_by('startTime')

        serializer = PersonalMeetingDetailSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def past(self, request):
        """
        Возвращает прошедшие личные встречи
        """
        now = timezone.now()
        queryset = PersonalMeeting.objects.filter(
            Q(request__organizer=request.user) | Q(
                request__invitee=request.user),
            Q(endTime__lt=now) | Q(status=PersonalMeeting.STATUS_COMPLETED)
        ).order_by('-startTime')

        serializer = PersonalMeetingDetailSerializer(queryset, many=True)
        return Response(serializer.data)
