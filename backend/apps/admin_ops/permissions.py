from rest_framework.permissions import BasePermission


class IsSuperAdmin(BasePermission):
    message = "Only super admins can manage hierarchy records."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (getattr(user, "role", None) == "super_admin" or getattr(user, "is_superuser", False))
        )
