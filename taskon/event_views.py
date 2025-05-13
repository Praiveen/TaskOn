from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from .models import User, Department, SubDepartment, Event, Meeting, Notification


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_recipients(request):
    """
    Возвращает доступные отделы и подотделы
    """
    current_user = request.user
    response = {
        'departments': [],
        'subdepartments': []
    }

    try:

        if current_user.company and current_user.company.director_id == current_user.userId:

            departments = Department.objects.filter(
                company=current_user.company)
            for dept in departments:
                dept_data = {
                    'id': dept.departmentId,
                    'name': dept.departmentName
                }
                response['departments'].append(dept_data)

                subdepartments = SubDepartment.objects.filter(department=dept)
                for subdept in subdepartments:
                    subdept_data = {
                        'id': subdept.subdepartmentId,
                        'name': subdept.subdepartmentName
                    }
                    response['subdepartments'].append(subdept_data)

        elif Department.objects.filter(manager=current_user).exists():
            department = Department.objects.get(manager=current_user)
            dept_data = {
                'id': department.departmentId,
                'name': department.departmentName
            }
            response['departments'].append(dept_data)

            subdepartments = SubDepartment.objects.filter(
                department=department)
            for subdept in subdepartments:
                subdept_data = {
                    'id': subdept.subdepartmentId,
                    'name': subdept.subdepartmentName
                }
                response['subdepartments'].append(subdept_data)

        elif SubDepartment.objects.filter(manager=current_user).exists():
            subdepartment = SubDepartment.objects.get(manager=current_user)
            subdept_data = {
                'id': subdepartment.subdepartmentId,
                'name': subdepartment.subdepartmentName
            }
            response['subdepartments'].append(subdept_data)

        return Response(response)

    except Exception as e:
        return Response(
            {"error": f"Ошибка при получении списка получателей: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_event(request, type, id):
    """
    Создает событие
    """
    try:
        current_user = request.user
        data = request.data

        event = Event()
        event.title = data.get('title')
        event.description = data.get('description')
        event.startTime = data.get('startTime')
        event.endTime = data.get('endTime')
        event.location = data.get('location')
        event.status = Event.STATUS_PLANNED
        event.createdBy = current_user
        event.save()

        participants = []

        if type == 'department':
            try:
                department = Department.objects.get(departmentId=id)
                participants = list(User.objects.filter(department=department))

                if hasattr(department, 'manager') and department.manager:
                    participants.append(department.manager)
            except Department.DoesNotExist:
                return Response(
                    {"error": "Отдел не найден"},
                    status=status.HTTP_404_NOT_FOUND
                )

        elif type == 'subdepartment':
            try:
                subdepartment = SubDepartment.objects.get(subdepartmentId=id)
                participants = list(User.objects.filter(
                    subDepartment=subdepartment))

                if hasattr(subdepartment, 'manager') and subdepartment.manager:
                    participants.append(subdepartment.manager)
            except SubDepartment.DoesNotExist:
                return Response(
                    {"error": "Рабочая группа не найдена"},
                    status=status.HTTP_404_NOT_FOUND
                )

        for participant in participants:
            event.participants.add(participant)

            notification = Notification()
            notification.sender = current_user
            notification.receiver = participant
            notification.company = current_user.company
            notification.message = f"Вы добавлены в событие: {event.title}"
            notification.type = "simpleMessage"
            notification.sendDate = timezone.now()
            notification.isCompleted = False
            notification.save()

        return Response(status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": f"Ошибка при создании события: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_events(request):
    """
    Возвращает события пользователя
    """
    current_user = request.user

    all_events = Event.objects.filter(
        participants=current_user) | Event.objects.filter(createdBy=current_user)
    all_events = all_events.distinct()

    response = {
        'currentEvents': [],
        'pastEvents': []
    }

    for event in all_events:
        event_data = {
            'eventId': event.eventId,
            'title': event.title,
            'description': event.description,
            'startTime': event.startTime.isoformat() if event.startTime else None,
            'endTime': event.endTime.isoformat() if event.endTime else None,
            'location': event.location,
            'status': event.status,
            'createdBy': f"{event.createdBy.firstName} {event.createdBy.lastName}",
            'isCreator': event.createdBy.userId == current_user.userId
        }

        if event.status == Event.STATUS_PLANNED:
            response['currentEvents'].append(event_data)
        else:
            response['pastEvents'].append(event_data)

    response['currentEvents'] = sorted(
        response['currentEvents'], key=lambda x: x['startTime'])
    response['pastEvents'] = sorted(
        response['pastEvents'], key=lambda x: x['startTime'], reverse=True)

    return Response(response)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_meeting(request, type, id):
    """
    Создает встречу
    """
    try:
        current_user = request.user
        data = request.data

        meeting = Meeting()
        meeting.topic = data.get('topic')
        meeting.agenda = data.get('agenda')
        meeting.startTime = data.get('startTime')
        meeting.endTime = data.get('endTime')
        meeting.location = data.get('location')
        meeting.status = Meeting.STATUS_PLANNED
        meeting.organizer = current_user
        meeting.save()

        participants = []

        if type == 'department':
            try:
                department = Department.objects.get(departmentId=id)
                participants = list(User.objects.filter(department=department))

                if hasattr(department, 'manager') and department.manager:
                    participants.append(department.manager)
            except Department.DoesNotExist:
                return Response(
                    {"error": "Отдел не найден"},
                    status=status.HTTP_404_NOT_FOUND
                )

        elif type == 'subdepartment':
            try:
                subdepartment = SubDepartment.objects.get(subdepartmentId=id)
                participants = list(User.objects.filter(
                    subDepartment=subdepartment))

                if hasattr(subdepartment, 'manager') and subdepartment.manager:
                    participants.append(subdepartment.manager)
            except SubDepartment.DoesNotExist:
                return Response(
                    {"error": "Рабочая группа не найдена"},
                    status=status.HTTP_404_NOT_FOUND
                )

        for participant in participants:
            meeting.participants.add(participant)

            notification = Notification()
            notification.sender = current_user
            notification.receiver = participant
            notification.company = current_user.company
            notification.message = f"Вы добавлены во встречу: {meeting.topic}"
            notification.type = "simpleMessage"
            notification.sendDate = timezone.now()
            notification.isCompleted = False
            notification.save()

        return Response(status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": f"Ошибка при создании встречи: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_meetings(request):
    """
    Возвращает встречи пользователя
    """
    current_user = request.user

    all_meetings = Meeting.objects.filter(
        participants=current_user) | Meeting.objects.filter(organizer=current_user)
    all_meetings = all_meetings.distinct()

    response = {
        'currentMeetings': [],
        'pastMeetings': []
    }

    for meeting in all_meetings:
        meeting_data = {
            'meetingId': meeting.meetingId,
            'topic': meeting.topic,
            'agenda': meeting.agenda,
            'startTime': meeting.startTime.isoformat() if meeting.startTime else None,
            'endTime': meeting.endTime.isoformat() if meeting.endTime else None,
            'room': meeting.room.roomName if meeting.room else None,
            'location': meeting.location,
            'status': meeting.status,
            'organizer': f"{meeting.organizer.firstName} {meeting.organizer.lastName}",
            'isOrganizer': meeting.organizer.userId == current_user.userId
        }

        if meeting.status == Meeting.STATUS_PLANNED:
            response['currentMeetings'].append(meeting_data)
        else:
            response['pastMeetings'].append(meeting_data)

    response['currentMeetings'] = sorted(
        response['currentMeetings'], key=lambda x: x['startTime'])
    response['pastMeetings'] = sorted(
        response['pastMeetings'], key=lambda x: x['startTime'], reverse=True)

    return Response(response)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_event(request, id):
    """
    Удаляет событие
    """
    try:
        current_user = request.user

        try:
            event = Event.objects.get(eventId=id)
        except Event.DoesNotExist:
            return Response(
                {"error": "Событие не найдено"},
                status=status.HTTP_404_NOT_FOUND
            )

        if event.createdBy.userId != current_user.userId:
            return Response(
                {"error": "Вы не можете удалить это событие, так как не являетесь его создателем"},
                status=status.HTTP_403_FORBIDDEN
            )

        event.delete()

        return Response(status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": f"Ошибка при удалении события: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_meeting(request, id):
    """
    Удаляет встречу
    """
    try:
        current_user = request.user

        try:
            meeting = Meeting.objects.get(meetingId=id)
        except Meeting.DoesNotExist:
            return Response(
                {"error": "Встреча не найдена"},
                status=status.HTTP_404_NOT_FOUND
            )

        if meeting.organizer.userId != current_user.userId:
            return Response(
                {"error": "Вы не можете удалить эту встречу, так как не являетесь ее организатором"},
                status=status.HTTP_403_FORBIDDEN
            )

        meeting.delete()

        return Response(status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": f"Ошибка при удалении встречи: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_event(request, id):
    """
    Отмечает событие как завершенное
    """
    try:
        current_user = request.user

        try:
            event = Event.objects.get(eventId=id)
        except Event.DoesNotExist:
            return Response(
                {"error": "Событие не найдено"},
                status=status.HTTP_404_NOT_FOUND
            )

        if event.createdBy.userId != current_user.userId:
            return Response(
                {"error": "Вы не можете изменить статус этого события, так как не являетесь его создателем"},
                status=status.HTTP_403_FORBIDDEN
            )

        event.status = Event.STATUS_COMPLETED
        event.save()

        return Response(status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": f"Ошибка при обновлении статуса события: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_meeting(request, id):
    """
    Отмечает встречу как завершенную
    """
    try:
        current_user = request.user

        try:
            meeting = Meeting.objects.get(meetingId=id)
        except Meeting.DoesNotExist:
            return Response(
                {"error": "Встреча не найдена"},
                status=status.HTTP_404_NOT_FOUND
            )

        if meeting.organizer.userId != current_user.userId:
            return Response(
                {"error": "Вы не можете изменить статус этой встречи, так как не являетесь ее организатором"},
                status=status.HTTP_403_FORBIDDEN
            )

        meeting.status = Meeting.STATUS_COMPLETED
        meeting.save()

        return Response(status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": f"Ошибка при обновлении статуса встречи: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
