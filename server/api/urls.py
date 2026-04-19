from django.urls import path

from .views import (
    AdminDashboardView,
    AgentDashboardView,
    AgentListCreateView,
    FieldDetailView,
    FieldListCreateView,
    FieldUpdatesView,
    LoginView,
    LogoutView,
    MeView,
    RefreshView,
    RegisterView,
    UpdatesFeedView,
    health,
)

urlpatterns = [
    path("health/", health, name="health"),
    path("auth/login", LoginView.as_view(), name="auth-login"),
    path("auth/refresh", RefreshView.as_view(), name="auth-refresh"),
    path("auth/logout", LogoutView.as_view(), name="auth-logout"),
    path("auth/register", RegisterView.as_view(), name="auth-register"),
    path("auth/me", MeView.as_view(), name="auth-me"),
    path("agents", AgentListCreateView.as_view(), name="agent-list-create"),
    path("fields", FieldListCreateView.as_view(), name="field-list-create"),
    path("fields/<int:pk>", FieldDetailView.as_view(), name="field-detail"),
    path("fields/<int:pk>/updates", FieldUpdatesView.as_view(), name="field-updates"),
    path("updates", UpdatesFeedView.as_view(), name="updates-feed"),
    path("dashboard/admin", AdminDashboardView.as_view(), name="dashboard-admin"),
    path("dashboard/agent", AgentDashboardView.as_view(), name="dashboard-agent"),
]
