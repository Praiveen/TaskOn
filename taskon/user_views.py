from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import SessionAuthentication
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.urls import reverse

from .models import User, Department, SubDepartment, Role, Company, Notification


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_data(request):
    """
    Возвращает данные текущего пользователя
    """
    current_user = request.user
    response = {
        'email': current_user.email,
        'firstName': current_user.firstName,
        'lastName': current_user.lastName,
        'phone': current_user.phoneNumber,
    }

    user_roles = current_user.roles.all()
    if user_roles.exists():
        user_role = user_roles.first().name
    else:
        user_role = "Роль не назначена"

    if current_user.company:
        response['company'] = current_user.company.companyName
    else:
        response['company'] = None

    if current_user.department:
        response['department'] = current_user.department.departmentName
    elif user_role == "DEPARTMENT_MANAGER":

        managed_department = Department.objects.filter(
            manager=current_user).first()
        if managed_department:
            response['department'] = managed_department.departmentName
        else:
            response['department'] = None
    else:
        response['department'] = None

    if current_user.subDepartment:
        response['subDepartment'] = current_user.subDepartment.subdepartmentName
    elif user_role == "SUBDEPARTMENT_MANAGER":
        managed_subdepartment = SubDepartment.objects.filter(
            manager=current_user).first()
        if managed_subdepartment:
            response['subDepartment'] = managed_subdepartment.subdepartmentName
        else:
            response['subDepartment'] = None
    else:
        response['subDepartment'] = None

    response['role'] = [
        {'name': role.name, 'description': role.description} for role in user_roles]

    return Response(response)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_user_data(request):
    """
    Обновляет данные пользователя
    """
    current_user = request.user
    data = request.data

    try:
        if 'firstName' in data:
            current_user.firstName = data['firstName']

        if 'lastName' in data:
            current_user.lastName = data['lastName']

        if 'phoneNumber' in data:
            current_user.phoneNumber = data['phoneNumber']

        current_user.save()

        return Response(status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": f"Ошибка при обновлении данных: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_companies(request):
    """
    Получение списка компаний для выбора в dropdown
    """
    companies = Company.objects.all()

    company_data = []
    for company in companies:
        data = {
            'id': company.companyId,
            'name': company.companyName,
            'address': company.address or "",
        }

        if company.director:
            data['directorId'] = company.director.userId
            data['directorName'] = f"{company.director.firstName} {company.director.lastName}"

        company_data.append(data)

    return Response(company_data)


@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    """
    Получение уведомлений для текущего пользователя
    """
    current_user = request.user
    notifications = Notification.objects.filter(
        receiver=current_user, isCompleted=False)

    notification_data = []
    for notification in notifications:
        data = {
            'id': notification.notificationId,
            'message': notification.message,
            'senderName': f"{notification.sender.firstName} {notification.sender.lastName}",
            'companyName': notification.company.companyName if notification.company else "",
            'sendDate': notification.sendDate,
            'type': notification.type
        }
        notification_data.append(data)

    return Response(notification_data)


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def request_company(request):
    """
    Запрос на присоединение к компании
    """
    current_user = request.user

    try:
        company_id = request.data.get('companyId')
        if not company_id:
            return Response({'error': 'ID компании не указан'}, status=status.HTTP_400_BAD_REQUEST)

        company = get_object_or_404(Company, companyId=company_id)

        if Notification.objects.filter(sender=current_user, company=company, isCompleted=False).exists():
            return Response(
                {'error': 'У вас уже есть активная заявка на вступление в эту компанию'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if current_user.company:
            return Response(
                {'error': 'Вы уже состоите в компании'},
                status=status.HTTP_400_BAD_REQUEST
            )

        director = company.director
        if not director:
            return Response(
                {'error': 'У компании нет директора'},
                status=status.HTTP_400_BAD_REQUEST
            )

        notification = Notification(
            sender=current_user,
            company=company,
            receiver=director,
            message=f"Пользователь {current_user.firstName} {current_user.lastName} хочет присоединиться к компании",
            type="actionMessage",
            sendDate=timezone.now(),
            isCompleted=False
        )
        notification.save()

        return Response({'message': 'Заявка успешно отправлена'})

    except Exception as e:
        return Response(
            {'error': f'Ошибка при создании заявки: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def accept_company_request(request, notification_id):
    try:
        notification = get_object_or_404(
            Notification, notificationId=notification_id)

        if notification.isCompleted:
            return Response({'message': 'Заявка уже обработана'}, status=status.HTTP_400_BAD_REQUEST)

        user = notification.sender
        company = notification.company

        user.company = company

        employee_role = get_object_or_404(Role, name=Role.EMPLOYEE)
        user.roles.add(employee_role)

        user.save()

        notification.isCompleted = True
        notification.save()

        return Response({'message': 'Заявка успешно принята', 'success': True})

    except Exception as e:
        return Response(
            {'message': f'Ошибка при принятии заявки: {str(e)}',
             'success': False},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def reject_company_request(request, notification_id):
    """
    Отклонение запроса на вступление в компанию
    """
    try:
        notification = get_object_or_404(
            Notification, notificationId=notification_id)

        if notification.isCompleted:
            return Response({'message': 'Заявка уже обработана', 'success': True}, status=status.HTTP_400_BAD_REQUEST)

        notification.isCompleted = True
        notification.save()

        reject_notification = Notification(
            sender=notification.receiver,
            company=notification.company,
            receiver=notification.sender,
            message=f"Пользователь {notification.receiver.firstName} {notification.receiver.lastName} отклонил заявку",
            type="simpleMessage",
            sendDate=timezone.now(),
            isCompleted=False
        )
        reject_notification.save()

        return Response({'message': 'Заявка успешно отклонена', 'success': True})

    except Exception as e:
        return Response(
            {'message':
                f'Ошибка при отклонении заявки: {str(e)}', 'success': False},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """
    Отметка уведомления как прочитанного
    """
    try:
        notification = get_object_or_404(
            Notification, notificationId=notification_id)

        if notification.isCompleted:
            return Response({'message': 'Уведомление уже обработано', 'success': True}, status=status.HTTP_400_BAD_REQUEST)

        notification.isCompleted = True
        notification.save()

        return Response({'message': 'Уведомление помечено прочитанным', 'success': True})

    except Exception as e:
        return Response(
            {'message':
                f'Ошибка при обработке уведомления: {str(e)}', 'success': False},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def create_company_api(request):

    current_user = request.user

    if current_user.company:
        return Response(
            {'error': 'Вы уже состоите в компании'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        company_name = request.data.get('companyName')
        address = request.data.get('address')

        if not company_name:
            return Response(
                {'error': 'Название компании не указано'},
                status=status.HTTP_400_BAD_REQUEST
            )

        company = Company(
            companyName=company_name,
            address=address,
        )
        company.save()

        company.director = current_user
        company.save()

        current_user.company = company

        try:
            director_role = Role.objects.get(name=Role.DIRECTOR)
            current_user.roles.add(director_role)
        except Role.DoesNotExist:
            director_role = Role.objects.create(
                name=Role.DIRECTOR,
                description=Role.ROLE_DESCRIPTIONS.get(
                    Role.DIRECTOR, "Директор компании")
            )
            current_user.roles.add(director_role)

        current_user.save()

        return Response({
            'message': 'Компания успешно создана',
            'company': {
                'id': company.companyId,
                'name': company.companyName,
                'address': company.address
            }
        })

    except Exception as e:
        return Response(
            {'error': f'Ошибка при создании компании: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def create_department(request):
    """
    Создание отдела компании
    """
    current_user = request.user

    try:

        if not current_user.company or not current_user.company.director == current_user:
            return Response(
                {'error': 'Только директор может создавать отделы'},
                status=status.HTTP_403_FORBIDDEN
            )

        department_name = request.data.get('departmentName')
        head_id = request.data.get('headId')

        if not department_name or not head_id:
            return Response(
                {'error': 'Название отдела и ID руководителя обязательны'},
                status=status.HTTP_400_BAD_REQUEST
            )

        head = get_object_or_404(User, userId=head_id)
        print(head)

        if (head.department is not None or
            head.subDepartment is not None or
            Department.objects.filter(users__userId=head.userId, users__roles__name=Role.DEPARTMENT_MANAGER).exists() or
                SubDepartment.objects.filter(users__userId=head.userId, users__roles__name=Role.SUBDEPARTMENT_MANAGER).exists()):
            return Response(
                {'error': 'Выбранный пользователь уже является менеджером или состоит в другом отделе/подотделе'},
                status=status.HTTP_400_BAD_REQUEST
            )

        department = Department(
            departmentName=department_name,
            company=current_user.company,
            manager=head
        )
        department.save()

        head.department = department
        manager_role = Role.objects.get(name=Role.DEPARTMENT_MANAGER)

        try:
            employee_role = Role.objects.get(name=Role.EMPLOYEE)
            head.roles.remove(employee_role)
        except:
            pass

        head.roles.add(manager_role)
        head.save()

        return Response(status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Ошибка при создании отдела: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_departments(request):
    """
    Получение списка отделов компании
    """
    current_user = request.user

    try:
        if not current_user.company:
            return Response([], status=status.HTTP_200_OK)

        company = current_user.company
        departments = Department.objects.filter(company=company)

        department_data = []
        for dept in departments:

            manager = User.objects.filter(
                department=dept,
                roles__name=Role.DEPARTMENT_MANAGER
            ).first()

            data = {
                'id': dept.departmentId,
                'name': dept.departmentName,
                'managerId': manager.userId if manager else None,
                'managerName': f"{manager.firstName} {manager.lastName}" if manager else "Нет менеджера",
                'employeesCount': User.objects.filter(department=dept).count()
            }
            department_data.append(data)

        return Response(department_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Ошибка при получении отделов: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def delete_department(request, department_id):
    """
    Удаление отдела
    """
    current_user = request.user

    try:

        if not current_user.company or not current_user.company.director == current_user:
            return Response(
                {'error': 'Только директор может удалять отделы'},
                status=status.HTTP_403_FORBIDDEN
            )

        department = get_object_or_404(Department, departmentId=department_id)

        manager = User.objects.filter(
            department=department,
            roles__name=Role.DEPARTMENT_MANAGER
        ).first()

        if manager:

            manager.roles.remove(Role.objects.get(
                name=Role.DEPARTMENT_MANAGER))
            manager.roles.add(Role.objects.get(name=Role.EMPLOYEE))

            manager.department = None
            manager.save()

        for user in User.objects.filter(department=department):
            user.department = None
            user.save()

        department.delete()

        return Response(status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Ошибка при удалении отдела: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_department_data(request, department_id):
    """
    Получение данных конкретного отдела
    """
    try:
        department = get_object_or_404(Department, departmentId=department_id)

        manager = User.objects.filter(
            department=department,
            roles__name=Role.DEPARTMENT_MANAGER
        ).first()

        data = {
            'id': department.departmentId,
            'name': department.departmentName,
            'managerId': manager.userId if manager else None,
            'managerName': f"{manager.firstName} {manager.lastName}" if manager else "Нет менеджера"
        }

        return Response(data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Ошибка при получении данных отдела: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def update_department(request, department_id):
    """
    Обновление данных отдела
    """
    current_user = request.user

    try:

        if not current_user.company or not current_user.company.director == current_user:
            return Response(
                {'error': 'Только директор может изменять отделы'},
                status=status.HTTP_403_FORBIDDEN
            )

        department = get_object_or_404(Department, departmentId=department_id)

        department_name = request.data.get('departmentName')
        if department_name:
            department.departmentName = department_name
            department.save()

        head_id = request.data.get('headId')
        if head_id:
            new_manager = get_object_or_404(User, userId=head_id)

            old_manager = User.objects.filter(
                department=department,
                roles__name=Role.DEPARTMENT_MANAGER
            ).first()

            if (new_manager != old_manager and
                    (new_manager.department is not None or
                     new_manager.subDepartment is not None or
                     User.objects.filter(
                         userId=new_manager.userId,
                         roles__name__in=[
                             Role.DEPARTMENT_MANAGER, Role.SUBDEPARTMENT_MANAGER]
                     ).exists())):
                return Response(
                    {'error': 'Выбранный пользователь уже является менеджером или состоит в другом отделе/подотделе'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if old_manager and old_manager != new_manager:
                old_manager.roles.remove(
                    Role.objects.get(name=Role.DEPARTMENT_MANAGER))
                old_manager.roles.add(Role.objects.get(name=Role.EMPLOYEE))
                old_manager.department = None
                old_manager.save()

            if new_manager != old_manager:

                try:
                    employee_role = Role.objects.get(name=Role.EMPLOYEE)
                    new_manager.roles.remove(employee_role)
                except:
                    pass

                new_manager.roles.add(Role.objects.get(
                    name=Role.DEPARTMENT_MANAGER))
                new_manager.department = department
                new_manager.save()

            department.manager = new_manager
            department.save()

        return Response(status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Ошибка при обновлении отдела: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def create_subdepartment(request):
    """
    Создание подотдела (рабочей группы)
    """

    request_data = None

    if request.content_type and 'application/json' in request.content_type:
        try:
            request_data = request.data
        except Exception as e:
            return Response({'error': 'Ошибка при чтении JSON данных'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        request_data = request.POST

    current_user = request.user

    try:

        if (not current_user.company or
            (not current_user.company.director == current_user and
             not current_user.roles.filter(name=Role.DEPARTMENT_MANAGER).exists())):
            return Response(
                {'error': 'Только директор или руководитель отдела может создавать рабочие группы'},
                status=status.HTTP_403_FORBIDDEN
            )

        subdepartment_name = request_data.get('subdepartmentName')
        head_id = request_data.get('headId')
        department_id = request_data.get('departmentId')

        if not subdepartment_name or not head_id or not department_id:
            missing = []
            if not subdepartment_name:
                missing.append('название подотдела')
            if not head_id:
                missing.append('ID руководителя')
            if not department_id:
                missing.append('ID отдела')

            error_msg = f'Отсутствуют обязательные поля: {", ".join(missing)}'
            return Response(
                {'error': error_msg},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            head_id = int(head_id)
            department_id = int(department_id)
        except (TypeError, ValueError):
            error_msg = 'ID руководителя и ID отдела должны быть целыми числами'
            return Response({'error': error_msg}, status=status.HTTP_400_BAD_REQUEST)

        try:

            department = get_object_or_404(
                Department, departmentId=department_id)

            head = get_object_or_404(User, userId=head_id)

            if head.department != department:
                return Response(
                    {'error': 'Выбранный пользователь должен быть сотрудником этого отдела'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if (head.subDepartment is not None or
                    SubDepartment.objects.filter(manager=head).exists()):
                return Response(
                    {'error': 'Выбранный пользователь уже является менеджером или состоит в другом подотделе'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            subdepartment = SubDepartment(
                subdepartmentName=subdepartment_name,
                department=department,
                manager=head
            )
            subdepartment.save()

            manager_role = Role.objects.get(name=Role.SUBDEPARTMENT_MANAGER)
            employee_role = Role.objects.get(name=Role.EMPLOYEE)
            if employee_role in head.roles.all():
                head.roles.remove(employee_role)
            head.roles.add(manager_role)
            head.save()

            return Response({'success': 'Подотдел успешно создан'}, status=status.HTTP_200_OK)

        except Department.DoesNotExist:
            error_msg = f'Отдел с ID {department_id} не существует'
            return Response({'error': error_msg}, status=status.HTTP_404_NOT_FOUND)

        except User.DoesNotExist:
            error_msg = f'Пользователь с ID {head_id} не существует'
            return Response({'error': error_msg}, status=status.HTTP_404_NOT_FOUND)

        except Role.DoesNotExist:
            error_msg = 'Роль SUBDEPARTMENT_MANAGER не существует'
            return Response({'error': error_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Ошибка при создании рабочей группы: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_subdepartments(request, department_id):
    """
    Получение списка подотделов отдела
    """
    try:
        department = get_object_or_404(Department, departmentId=department_id)
        subdepartments = SubDepartment.objects.filter(department=department)

        subdepartment_data = []
        for subdept in subdepartments:
            data = {
                'id': subdept.subdepartmentId,
                'name': subdept.subdepartmentName,
                'departmentId': department.departmentId,
                'departmentName': department.departmentName,
                'managerId': subdept.manager.userId if subdept.manager else None,
                'managerName': f"{subdept.manager.firstName} {subdept.manager.lastName}" if subdept.manager else "Нет менеджера",
                'employeesCount': User.objects.filter(subDepartment=subdept).count() + 1
            }
            subdepartment_data.append(data)

        return Response(subdepartment_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Ошибка при получении рабочих групп: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_available_subdepartment_managers(request, department_id):
    """
    Получение списка доступных руководителей подотделов (из сотрудников отдела)
    """
    try:
        department = get_object_or_404(Department, departmentId=department_id)

        available_managers = User.objects.filter(department=department).exclude(
            roles__name=Role.DEPARTMENT_MANAGER
        ).filter(subDepartment=None).exclude(
            userId__in=SubDepartment.objects.values_list(
                'manager__userId', flat=True)
        )

        if department.manager:
            available_managers = available_managers.exclude(
                userId=department.manager.userId)

        manager_data = []
        for user in available_managers:
            data = {
                'userId': user.userId,
                'firstName': user.firstName,
                'lastName': user.lastName
            }
            manager_data.append(data)

        return Response(manager_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Ошибка при получении доступных руководителей: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_subdepartment(request, subdepartment_id):
    """
    Получение данных конкретного подотдела
    """
    try:
        subdepartment = get_object_or_404(
            SubDepartment, subdepartmentId=subdepartment_id)

        data = {
            'id': subdepartment.subdepartmentId,
            'name': subdepartment.subdepartmentName,
            'departmentId': subdepartment.department.departmentId,
            'managerId': subdepartment.manager.userId if subdepartment.manager else None,
            'managerName': f"{subdepartment.manager.firstName} {subdepartment.manager.lastName}" if subdepartment.manager else "Нет менеджера"
        }

        return Response(data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Ошибка при получении данных рабочей группы: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def update_subdepartment(request, subdepartment_id):
    """
    Обновление данных подотдела
    """
    current_user = request.user

    try:
        subdepartment = get_object_or_404(
            SubDepartment, subdepartmentId=subdepartment_id)

        if (not current_user.company or
            (not current_user.company.director == current_user and
             not current_user == subdepartment.department.manager)):
            return Response(
                {'error': 'Недостаточно прав для изменения рабочей группы'},
                status=status.HTTP_403_FORBIDDEN
            )

        subdepartment_name = request.data.get('subdepartmentName')
        if subdepartment_name:
            subdepartment.subdepartmentName = subdepartment_name

        head_id = request.data.get('headId')
        if head_id:
            new_manager = get_object_or_404(User, userId=head_id)
            old_manager = subdepartment.manager

            if new_manager.department != subdepartment.department:
                return Response(
                    {'error': 'Выбранный пользователь должен быть сотрудником этого отдела'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if (new_manager.subDepartment is not None and new_manager.subDepartment != subdepartment or
                (SubDepartment.objects.filter(manager=new_manager).exists() and
                 not subdepartment.manager == new_manager)):
                return Response(
                    {'error': 'Выбранный пользователь уже является менеджером или состоит в другом подотделе'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if old_manager:
                old_manager.roles.remove(Role.objects.get(
                    name=Role.SUBDEPARTMENT_MANAGER))
                old_manager.roles.add(Role.objects.get(name=Role.EMPLOYEE))
                old_manager.save()

            new_manager.roles.remove(Role.objects.get(name=Role.EMPLOYEE))
            new_manager.roles.add(Role.objects.get(
                name=Role.SUBDEPARTMENT_MANAGER))
            new_manager.save()

            subdepartment.manager = new_manager

        subdepartment.save()

        return Response(status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Ошибка при обновлении рабочей группы: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def delete_subdepartment(request, subdepartment_id):
    """
    Удаление подотдела
    """
    current_user = request.user

    try:
        subdepartment = get_object_or_404(
            SubDepartment, subdepartmentId=subdepartment_id)

        if (not current_user.company or
            (not current_user.company.director == current_user and
             not current_user == subdepartment.department.manager)):
            return Response(
                {'error': 'Недостаточно прав для удаления рабочей группы'},
                status=status.HTTP_403_FORBIDDEN
            )

        if subdepartment.manager:
            manager = subdepartment.manager
            manager.roles.remove(Role.objects.get(
                name=Role.SUBDEPARTMENT_MANAGER))
            manager.roles.add(Role.objects.get(name=Role.EMPLOYEE))
            manager.save()

        subdepartment.delete()

        return Response(status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Ошибка при удалении рабочей группы: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@login_required
def get_current_user_department(request):
    """Получение информации об отделе, в котором пользователь является руководителем"""
    try:

        department = Department.objects.filter(manager=request.user).first()

        if not department:
            return JsonResponse({'error': 'Отдел не найден для текущего пользователя'}, status=404)

        return JsonResponse({
            'id': department.departmentId,
            'name': department.departmentName
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def get_current_user_subdepartment(request):
    """Получение информации о подотделе, в котором пользователь является руководителем"""
    try:

        subdepartment = SubDepartment.objects.filter(
            manager=request.user).first()

        if not subdepartment:
            return JsonResponse({'error': 'Подотдел не найден для текущего пользователя'}, status=404)

        return JsonResponse({
            'id': subdepartment.subdepartmentId,
            'name': subdepartment.subdepartmentName
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def grant_full_access(request, user_id):
    """
    Назначение полного доступа пользователю
    """
    current_user = request.user

    try:

        if not current_user.company or not current_user.has_role(Role.DIRECTOR):
            return Response({'error': 'Только директор может назначать полный доступ'}, status=status.HTTP_403_FORBIDDEN)

        user = get_object_or_404(User, userId=user_id)
        full_access_role = Role.objects.get(name=Role.FULL_ACCESS)

        user.roles.add(full_access_role)
        user.save()

        return Response(status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Ошибка при назначении полного доступа: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def revoke_full_access(request, user_id):
    """
    Отзыв полного доступа у пользователя
    """
    current_user = request.user

    try:

        if not current_user.company or not current_user.has_role(Role.DIRECTOR):
            return Response({'error': 'Только директор может отзывать полный доступ'}, status=status.HTTP_403_FORBIDDEN)

        user = get_object_or_404(User, userId=user_id)
        full_access_role = Role.objects.get(name=Role.FULL_ACCESS)

        if user.roles.filter(name=Role.FULL_ACCESS).exists():
            user.roles.remove(full_access_role)
            user.save()

        return Response(status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Ошибка при отзыве полного доступа: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_company_users(request):
    """
    Получение списка пользователей компании текущего пользователя
    Для использования в формах создания/редактирования отделов и подотделов
    """
    current_user = request.user

    try:
        if not current_user.company:
            return Response([], status=status.HTTP_200_OK)

        available_users = User.objects.filter(company=current_user.company).filter(
            department=None,
            subDepartment=None
        ).exclude(

            userId=current_user.company.director.userId if current_user.company.director else None
        ).exclude(

            userId__in=Department.objects.filter(
                manager__isnull=False).values_list('manager__userId', flat=True)
        ).exclude(

            userId__in=SubDepartment.objects.filter(
                manager__isnull=False).values_list('manager__userId', flat=True)
        )

        user_data = []
        for user in available_users:
            data = {
                'userId': user.userId,
                'firstName': user.firstName,
                'lastName': user.lastName
            }
            user_data.append(data)

        return Response(user_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Ошибка при получении пользователей компании: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_available_employees(request, target_type, target_id):
    """
    Получение списка доступных сотрудников для добавления в отдел/подотдел
    """
    current_user = request.user

    try:
        available_users = []

        if target_type == 'department':

            if not current_user.company or not current_user.company.director == current_user:
                return Response({'error': 'Недостаточно прав'}, status=status.HTTP_403_FORBIDDEN)

            department = get_object_or_404(Department, departmentId=target_id)

            available_users = User.objects.filter(company=current_user.company).filter(
                department=None
            ).exclude(
                userId=current_user.company.director.userId if current_user.company.director else None
            ).exclude(
                userId__in=Department.objects.filter(
                    manager__isnull=False).values_list('manager__userId', flat=True)
            ).exclude(
                userId__in=SubDepartment.objects.filter(
                    manager__isnull=False).values_list('manager__userId', flat=True)
            )

        elif target_type == 'subdepartment':

            subdepartment = get_object_or_404(
                SubDepartment, subdepartmentId=target_id)

            if (not current_user.company or
                (not current_user.company.director == current_user and
                 not current_user == subdepartment.department.manager and
                 not current_user == subdepartment.manager)):
                return Response({'error': 'Недостаточно прав'}, status=status.HTTP_403_FORBIDDEN)

            available_users = User.objects.filter(
                department=subdepartment.department,
                subDepartment=None
            )

            available_users = available_users.exclude(
                roles__name=Role.DEPARTMENT_MANAGER)

            available_users = available_users.exclude(
                userId__in=SubDepartment.objects.filter(
                    manager__isnull=False).values_list('manager__userId', flat=True)
            )

            if subdepartment.department.manager:
                available_users = available_users.exclude(
                    userId=subdepartment.department.manager.userId)

        else:
            return Response({'error': 'Некорректный тип цели'}, status=status.HTTP_400_BAD_REQUEST)

        user_data = []
        for user in available_users:
            data = {
                'userId': user.userId,
                'firstName': user.firstName,
                'lastName': user.lastName
            }
            user_data.append(data)

        return Response(user_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Ошибка при получении доступных сотрудников: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def assign_employees(request, target_type, target_id):
    """
    Назначение сотрудников в отдел/подотдел
    """
    current_user = request.user

    try:
        employee_ids = request.data

        if not employee_ids or not isinstance(employee_ids, list):
            return Response({'error': 'Необходимо предоставить список ID сотрудников'}, status=status.HTTP_400_BAD_REQUEST)

        if target_type == 'department':

            if not current_user.company or not current_user.company.director == current_user:
                return Response({'error': 'Недостаточно прав'}, status=status.HTTP_403_FORBIDDEN)

            department = get_object_or_404(Department, departmentId=target_id)

            for employee_id in employee_ids:
                employee = get_object_or_404(User, userId=employee_id)
                employee.department = department
                employee.save()

        elif target_type == 'subdepartment':
            subdepartment = get_object_or_404(
                SubDepartment, subdepartmentId=target_id)

            if (not current_user.company or
                (not current_user.company.director == current_user and
                 not current_user == subdepartment.department.manager and
                 not current_user == subdepartment.manager)):
                return Response({'error': 'Недостаточно прав'}, status=status.HTTP_403_FORBIDDEN)

            for employee_id in employee_ids:
                employee = get_object_or_404(User, userId=employee_id)

                if employee.department != subdepartment.department:
                    employee.department = subdepartment.department

                employee.subDepartment = subdepartment
                employee.save()

        else:
            return Response({'error': 'Некорректный тип цели'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Ошибка при назначении сотрудников: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_department_employees(request, department_id):
    """
    Получение списка сотрудников отдела
    """
    try:
        department = get_object_or_404(Department, departmentId=department_id)

        employees = User.objects.filter(department=department).exclude(
            roles__name=Role.DEPARTMENT_MANAGER
        )

        if department.manager:
            employees = employees.exclude(userId=department.manager.userId)

        employee_data = []
        for user in employees:
            data = {
                'userId': user.userId,
                'firstName': user.firstName,
                'lastName': user.lastName,
                'subdepartmentId': user.subDepartment.subdepartmentId if user.subDepartment else None
            }
            employee_data.append(data)

        return Response(employee_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Ошибка при получении сотрудников отдела: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_subdepartment_employees(request, subdepartment_id):
    """
    Получение списка сотрудников подотдела
    """
    try:
        subdepartment = get_object_or_404(
            SubDepartment, subdepartmentId=subdepartment_id)

        employees = User.objects.filter(subDepartment=subdepartment).exclude(
            userId=subdepartment.manager.userId if subdepartment.manager else None
        )

        employees = employees.exclude(roles__name=Role.SUBDEPARTMENT_MANAGER)

        employee_data = []
        for user in employees:
            data = {
                'userId': user.userId,
                'firstName': user.firstName,
                'lastName': user.lastName
            }
            employee_data.append(data)

        return Response(employee_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Ошибка при получении сотрудников рабочей группы: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def remove_employees(request, target_type, target_id):
    """
    Удаление сотрудников из отдела/подотдела
    """
    current_user = request.user

    try:
        employee_ids = request.data

        if not employee_ids or not isinstance(employee_ids, list):
            return Response({'error': 'Необходимо предоставить список ID сотрудников'}, status=status.HTTP_400_BAD_REQUEST)

        if target_type == 'department':

            if not current_user.company or not current_user.company.director == current_user:
                return Response({'error': 'Недостаточно прав'}, status=status.HTTP_403_FORBIDDEN)

            department = get_object_or_404(Department, departmentId=target_id)

            for employee_id in employee_ids:
                employee = get_object_or_404(User, userId=employee_id)

                if SubDepartment.objects.filter(manager=employee).exists():
                    return Response(
                        {'error': 'Нельзя удалить руководителя подотдела из отдела'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                employee.department = None
                employee.subDepartment = None
                employee.save()

        elif target_type == 'subdepartment':
            subdepartment = get_object_or_404(
                SubDepartment, subdepartmentId=target_id)

            if (not current_user.company or
                (not current_user.company.director == current_user and
                 not current_user == subdepartment.department.manager and
                 not current_user == subdepartment.manager)):
                return Response({'error': 'Недостаточно прав'}, status=status.HTTP_403_FORBIDDEN)

            for employee_id in employee_ids:
                employee = get_object_or_404(User, userId=employee_id)
                employee.subDepartment = None
                employee.save()

        else:
            return Response({'error': 'Некорректный тип цели'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Ошибка при удалении сотрудников: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_preferred_mode(request):
    """
    Сохраняет предпочтительный режим работы пользователя
    """
    current_user = request.user
    data = request.data

    try:
        mode = data.get('mode')

        mode_mapping = {
            'personal': User.MODE_PERSONAL,
            'corporate': User.MODE_CORPORATE,
            'both': User.MODE_BOTH,
            'PERSONAL': User.MODE_PERSONAL,
            'CORPORATE': User.MODE_CORPORATE,
            'BOTH': User.MODE_BOTH
        }

        mapped_mode = mode_mapping.get(mode)

        if mapped_mode is None:
            return Response(
                {"error": "Некорректный режим"},
                status=status.HTTP_400_BAD_REQUEST
            )

        current_user.preferredMode = mapped_mode
        current_user.save()

        redirect_url = None
        if current_user.preferredMode == User.MODE_PERSONAL:
            redirect_url = reverse('personal_meetings')
        elif current_user.preferredMode == User.MODE_CORPORATE and current_user.company:
            redirect_url = reverse('dashboard')

        return Response({
            "status": "success",
            "message": "Предпочтения сохранены",
            "redirect": redirect_url,
            "saved_mode": current_user.preferredMode
        })

    except Exception as e:
        return Response(
            {"error": f"Ошибка при сохранении предпочтений: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
