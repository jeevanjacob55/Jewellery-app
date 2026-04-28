from rest_framework.permissions import BasePermission


class HasAdminAccess(BasePermission):
    message = "Only platform or scoped admins can access admin operations."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, "has_admin_console_access", False))


class IsSuperAdmin(BasePermission):
    message = "Only super admins can manage hierarchy records."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, "is_super_admin_user", False))
