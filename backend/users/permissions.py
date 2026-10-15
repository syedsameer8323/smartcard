from rest_framework.permissions import BasePermission

from .models import Role


class HasRole(BasePermission):
    allowed_roles: tuple = ()

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.role in self.allowed_roles)


class IsCustomer(HasRole):
    allowed_roles = (Role.CUSTOMER,)


class IsSeller(HasRole):
    allowed_roles = (Role.SELLER,)


class IsAdminRole(HasRole):
    allowed_roles = (Role.ADMIN,)


class IsSellerOrAdmin(HasRole):
    allowed_roles = (Role.SELLER, Role.ADMIN)
