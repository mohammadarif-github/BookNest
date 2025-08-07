from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password


class UserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField()
    password2 = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'password2')

    def validate_email(self, email):
        if User.objects.filter(email=email):
            raise serializers.ValidationError("Email already exists")
        return email

    def validate_password2(self, password2):
        password1 = self.initial_data.get("password")
        if password1 and password2 and password1 != password2:
            raise serializers.ValidationError("Passwords mismatched")
        return password2
    
    def create(self, validated_data):
        # Use create_user to properly hash the password
        instance = User.objects.create_user(
            username=validated_data.get("username"),
            email=validated_data.get("email"),
            password=validated_data.get("password2")  # This will be properly hashed
        )
        return instance


class PasswordResetSerializer(serializers.Serializer):
    """
    Serializer for requesting password reset
    """
    email = serializers.EmailField()

    def validate_email(self, email):
        # Basic email validation is handled by EmailField
        return email.lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for confirming password reset
    """
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8)
    confirm_password = serializers.CharField(min_length=8)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match")
        
        # Validate password strength
        try:
            validate_password(data['new_password'])
        except Exception as e:
            raise serializers.ValidationError(f"Password validation error: {e}")
        
        return data


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for changing password
    """
    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)
    confirm_password = serializers.CharField(min_length=8)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("New passwords do not match")
        
        # Validate password strength
        try:
            validate_password(data['new_password'])
        except Exception as e:
            raise serializers.ValidationError(f"Password validation error: {e}")
        
        return data



class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for UserProfile model
    """
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email')
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    
    class Meta:
        from .models import UserProfile
        model = UserProfile
        fields = ['username', 'email', 'first_name', 'last_name', 'phone_number', 'address', 'date_of_birth']
    
    def update(self, instance, validated_data):
        # Handle nested user data
        user_data = validated_data.pop('user', {})
        user = instance.user
        
        # Update user fields
        for attr, value in user_data.items():
            setattr(user, attr, value)
        user.save()
        
        # Update profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        return instance


class UserProfileViewSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for viewing user profile
    """
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    full_name = serializers.SerializerMethodField()
    booknest_role = serializers.SerializerMethodField()  # Changed from hotel_role
    
    class Meta:
        from .models import UserProfile
        model = UserProfile
        fields = ['username', 'email', 'first_name', 'last_name', 'full_name', 'phone_number', 'address', 'date_of_birth', 'created_at', 'updated_at', 'booknest_role']
    
    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
    
    def get_booknest_role(self, obj):
        """Get user's booknest role information"""
        try:
            from hotel_app.models import UserRole
            user_role = UserRole.objects.filter(user=obj.user, is_active=True).first()
            if user_role:
                return {
                    'role': user_role.role,
                    'department': user_role.department,
                    'permissions': user_role.permissions,
                    'assigned_by': user_role.assigned_by.username if user_role.assigned_by else None,
                    'assigned_date': user_role.assigned_date
                }
            # Check if user is superuser/admin
            elif obj.user.is_superuser or obj.user.is_staff:
                return {
                    'role': 'admin',
                    'department': None,
                    'permissions': {},
                    'assigned_by': None,
                    'assigned_date': None
                }
            else:
                return {
                    'role': 'guest',
                    'department': None,
                    'permissions': {},
                    'assigned_by': None,
                    'assigned_date': None
                }
        except Exception as e:
            # Fallback for users without hotel role
            return {
                'role': 'guest',
                'department': None,
                'permissions': {},
                'assigned_by': None,
                'assigned_date': None
            }
