from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied


class IsAdminUser(BasePermission):
    """
    Permission class for administrators only
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.is_staff and
            hasattr(request.user, 'booknest_role') and
            request.user.booknest_role.role == 'admin' and
            request.user.booknest_role.is_active
        )


class IsManagerOrAdmin(BasePermission):
    """
    Permission class for managers and administrators
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        if not hasattr(request.user, 'booknest_role'):
            return False
        
        user_role = request.user.booknest_role
        return (
            user_role.is_active and
            user_role.role in ['admin', 'manager']
        )


class IsStaffUser(BasePermission):
    """
    Permission class for staff members (managers, admin, and staff)
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        if not hasattr(request.user, 'booknest_role'):
            return False
        
        user_role = request.user.booknest_role
        return (
            user_role.is_active and
            user_role.role in ['admin', 'manager', 'staff']
        )


class CanAssignManager(BasePermission):
    """
    Permission class for assigning manager roles (Admin only)
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'booknest_role') and
            request.user.booknest_role.role == 'admin' and
            request.user.booknest_role.is_active
        )
        return (
            user_role.is_active and
            user_role.role in ['admin', 'manager', 'staff']
        )


def get_user_role(user):
    """
    Helper function to get user's booknest role
    """
    if hasattr(user, 'booknest_role'):
        return user.booknest_role.role
    return 'guest'


def has_permission(user, required_roles):
    """
    Helper function to check if user has required permissions
    """
    if not user.is_authenticated:
        return False
    
    user_role = get_user_role(user)
    return user_role in required_roles


def require_role(required_roles):
    """
    Decorator to check user role permissions
    """
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            if not has_permission(request.user, required_roles):
                raise PermissionDenied("You don't have permission to access this resource.")
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator
