from rest_framework import serializers
from .models import (
    User, Company, Department, SubDepartment, 
    Role, CompanyRole, Event, Meeting, 
    Room, Notification, MeetingTemplate,
    AvailabilitySchedule, PersonalMeetingRequest,
    PersonalMeeting
)


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name', 'description']


class DepartmentSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = Department
        fields = ['id', 'name', 'company', 'company_name']


class SubDepartmentSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = SubDepartment
        fields = ['id', 'name', 'department', 'department_name']


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description']


class CompanyRoleSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = CompanyRole
        fields = ['id', 'name', 'company', 'company_name']


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id', 'name', 'capacity']


class UserSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.departmentName', read_only=True)
    subdepartment_name = serializers.CharField(source='subDepartment.subdepartmentName', read_only=True)
    company_name = serializers.CharField(source='company.companyName', read_only=True)
    roles_info = RoleSerializer(source='roles', many=True, read_only=True)
    
    class Meta:
        model = User
        fields = [
            'userId', 'email', 'fullName', 'firstName', 'lastName',
            'phoneNumber', 'department', 'department_name',
            'subDepartment', 'subdepartment_name', 'company',
            'company_name', 'roles', 'roles_info',
            'createdAt', 'updatedAt'
        ]
        read_only_fields = ['createdAt', 'updatedAt']
        extra_kwargs = {'password': {'write_only': True}}
    
    def create(self, validated_data):
        roles_data = validated_data.pop('roles', [])
        user = User.objects.create_user(**validated_data)
        user.roles.set(roles_data)
        return user
    
    def update(self, instance, validated_data):
        if 'password' in validated_data:
            password = validated_data.pop('password')
            instance.set_password(password)
        
        roles_data = validated_data.pop('roles', None)
        if roles_data is not None:
            instance.roles.set(roles_data)
        
        return super().update(instance, validated_data)


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    roles = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), many=True, required=False)
    
    class Meta:
        model = User
        fields = [
            'email', 'password', 'fullName', 'firstName', 'lastName',
            'phoneNumber', 'department', 'subDepartment', 'company', 'roles',
            'preferredMode'
        ]
    
    def create(self, validated_data):
        roles_data = validated_data.pop('roles', [])
        user = User.objects.create_user(**validated_data)
        user.roles.set(roles_data)
        return user


class EventSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    participants_info = UserSerializer(source='participants', many=True, read_only=True)
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'start_time', 'end_time',
            'location', 'status', 'created_by', 'created_by_name',
            'participants', 'participants_info', 'is_completed',
            'is_planned', 'is_cancelled'
        ]
        read_only_fields = ['is_completed', 'is_planned', 'is_cancelled']


class MeetingSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source='organizer.full_name', read_only=True)
    participants_info = UserSerializer(source='participants', many=True, read_only=True)
    room_info = RoomSerializer(source='room', read_only=True)
    
    class Meta:
        model = Meeting
        fields = [
            'id', 'title', 'description', 'start_time', 'end_time',
            'room', 'room_info', 'organizer', 'organizer_name',
            'participants', 'participants_info'
        ]


class NotificationSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    receiver_name = serializers.CharField(source='receiver.full_name', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'created_at', 'is_read',
            'sender', 'sender_name', 'receiver', 'receiver_name'
        ]
        read_only_fields = ['created_at']


class MeetingTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingTemplate
        fields = '__all__'
        read_only_fields = ['owner', 'createdAt']


class AvailabilityScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilitySchedule
        fields = '__all__'
        read_only_fields = ['scheduleId']


class PersonalMeetingRequestSerializer(serializers.ModelSerializer):
    invitee = serializers.CharField(write_only=True)
    
    class Meta:
        model = PersonalMeetingRequest
        fields = '__all__'
        read_only_fields = ['organizer', 'createdAt']
    
    def validate_invitee(self, value):
        try:
            return User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError(f"Пользователь с email {value} не найден")


class PersonalMeetingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonalMeeting
        fields = '__all__'
        read_only_fields = ['meetingId']


class MeetingTemplateDetailSerializer(serializers.ModelSerializer):
    availability_schedules = AvailabilityScheduleSerializer(many=True, read_only=True)
    owner = UserSerializer(read_only=True)
    
    class Meta:
        model = MeetingTemplate
        fields = '__all__'


class PersonalMeetingRequestDetailSerializer(serializers.ModelSerializer):
    template = MeetingTemplateSerializer(read_only=True)
    organizer = UserSerializer(read_only=True)
    invitee = UserSerializer(read_only=True)
    
    class Meta:
        model = PersonalMeetingRequest
        fields = '__all__'


class PersonalMeetingDetailSerializer(serializers.ModelSerializer):
    request = PersonalMeetingRequestDetailSerializer(read_only=True)
    
    class Meta:
        model = PersonalMeeting
        fields = '__all__' 