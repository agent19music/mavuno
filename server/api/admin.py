from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Field, FieldUpdate, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("username", "email", "role", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active")
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Role and assignment", {"fields": ("role", "assigned_fields")}),
    )
    filter_horizontal = ("groups", "user_permissions", "assigned_fields")


@admin.register(Field)
class FieldAdmin(admin.ModelAdmin):
    list_display = ("name", "crop_type", "current_stage", "status", "planting_date", "created_at")
    list_filter = ("status", "current_stage", "crop_type")
    search_fields = ("name", "crop_type", "notes")


@admin.register(FieldUpdate)
class FieldUpdateAdmin(admin.ModelAdmin):
    list_display = ("field", "stage", "agent", "timestamp")
    list_filter = ("stage", "timestamp")
    search_fields = ("field__name", "agent__username", "agent__email", "notes")
