from django.http import HttpResponseRedirect
from django.contrib.auth import authenticate, login, logout
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, Role
from .serializers import UserCreateSerializer, UserSerializer


class RegisterUserDto:
    def __init__(self, data):
        self.email = data.get('email')
        self.fullName = data.get('fullName')
        self.firstName = data.get('firstName')
        self.lastName = data.get('lastName')
        self.password = data.get('password')
        self.passwordConfirm = data.get('passwordConfirm')


class LoginUserDto:
    def __init__(self, data):
        self.email = data.get('email')
        self.password = data.get('password')


class ResponseDto:
    def __init__(self, message, success):
        self.message = message
        self.success = success


class LoginResponse:
    def __init__(self, token, expires_in):
        self.token = token
        self.expires_in = expires_in


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    try:
        register_user_dto = RegisterUserDto(request.data)

        if register_user_dto.password != register_user_dto.passwordConfirm:
            return Response(
                {"message": "Пароли не совпадают", "success": False},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(register_user_dto.password) < 5:
            return Response(
                {"message": "Пароль должен содержать минимум 5 символов",
                    "success": False},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email=register_user_dto.email).exists():
            return Response(
                {"message": "Пользователь с такой почтой уже зарегистрирован",
                    "success": False},
                status=status.HTTP_400_BAD_REQUEST
            )

        user_data = {
            'email': register_user_dto.email,
            'fullName': register_user_dto.fullName,
            'firstName': register_user_dto.firstName,
            'lastName': register_user_dto.lastName,
            'password': register_user_dto.password,
            'preferredMode': None
        }

        serializer = UserCreateSerializer(data=user_data)

        if serializer.is_valid():
            user = serializer.save()

            try:
                user_role = Role.objects.get(name=Role.USER)
                user.roles.add(user_role)
            except Role.DoesNotExist:

                user_role = Role.objects.create(
                    name=Role.USER,
                    description=Role.ROLE_DESCRIPTIONS.get(
                        Role.USER, "Базовый пользователь системы")
                )
                user.roles.add(user_role)

            return Response(
                {"message": "Аккаунт зарегистрирован, теперь можно в него войти!",
                    "success": True},
                status=status.HTTP_200_OK
            )
        else:

            return Response(
                {"message": "Ошибка при регистрации",
                    "success": False, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
    except Exception as e:

        import traceback
        print(f"Ошибка при регистрации: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {"message": f"Ошибка сервера: {str(e)}", "success": False},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def authenticate_user(request):
    login_dto = LoginUserDto(request.data)

    if not login_dto.email or not login_dto.password:
        return Response(
            {"message": "Пожалуйста, введите email и пароль", "success": False},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = authenticate(email=login_dto.email, password=login_dto.password)

    if user is not None:
        login(request, user)

        redirect_url = '/dashboard/starter/'

        if not user.preferredMode:
            redirect_url = '/dashboard/starter/'
        elif user.preferredMode == User.MODE_PERSONAL:
            redirect_url = '/personal-meetings/'

        elif user.preferredMode == User.MODE_CORPORATE and user.company:
            redirect_url = '/dashboard/'

        elif user.preferredMode == User.MODE_BOTH and user.company:
            redirect_url = '/dashboard/'

        else:
            redirect_url = '/dashboard/starter/'

        return Response(
            {
                "message": "Вход выполнен успешно",
                "success": True,
                "redirect": redirect_url
            },
            status=status.HTTP_200_OK
        )
    else:
        return Response(
            {"message": "Неверный email или пароль", "success": False},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['GET'])
def logout_user(request):
    """
    Обработка выхода - аналог AuthenticationController.logout
    """
    try:

        logout(request)

        response = HttpResponseRedirect('/')

        response.delete_cookie('jwtToken')
        response.delete_cookie('csrftoken')
        response.delete_cookie('sessionid')

        return response
    except Exception as e:
        return Response(
            {"error": f"Ошибка при выходе из системы: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
