from rest_framework.permissions import BasePermission


class IsAdminUserRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)


class IsAgentUserRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_agent)


class CanViewField(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.user.is_admin:
            return True
        return obj.assigned_agents.filter(id=request.user.id).exists()


class CanModifyField(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.user.is_admin:
            return True
        return obj.assigned_agents.filter(id=request.user.id).exists()


class CanViewFieldUpdates(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.user.is_admin:
            return True
        return obj.assigned_agents.filter(id=request.user.id).exists()
