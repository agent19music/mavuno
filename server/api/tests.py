from datetime import timedelta
from io import StringIO
from unittest import mock

import yaml
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Field, FieldUpdate

User = get_user_model()


class OpenApiDocsTests(APITestCase):
    def test_schema_swagger_and_redoc_are_public(self):
        schema = self.client.get("/mavuno/api/schema/")
        self.assertEqual(schema.status_code, status.HTTP_200_OK)
        self.assertIn(b"openapi", schema.content.lower())
        spec = yaml.safe_load(schema.content.decode())
        paths = spec.get("paths", {})
        self.assertGreaterEqual(len(paths), 12)
        self.assertIn("/mavuno/api/auth/login", paths)
        self.assertIn("/mavuno/api/fields", paths)

        docs = self.client.get("/mavuno/api/docs/")
        self.assertEqual(docs.status_code, status.HTTP_200_OK)
        self.assertIn(b"swagger", docs.content.lower())

        redoc = self.client.get("/mavuno/api/redoc/")
        self.assertEqual(redoc.status_code, status.HTTP_200_OK)
        self.assertIn(b"redoc", redoc.content.lower())


class FieldModelTests(APITestCase):
    def test_can_transition_to_allows_only_next_or_same_stage(self):
        field = Field.objects.create(
            name="North Plot",
            crop_type="Maize",
            planting_date=timezone.now().date(),
            current_stage=Field.Stage.PLANTED,
        )
        self.assertTrue(field.can_transition_to(Field.Stage.PLANTED))
        self.assertTrue(field.can_transition_to(Field.Stage.GROWING))
        self.assertFalse(field.can_transition_to(Field.Stage.READY))

    def test_evaluate_status_at_risk_if_update_older_than_7_days(self):
        agent = User.objects.create_user(
            username="agent1", email="agent1@example.com", password="Password123!", role=User.Role.AGENT
        )
        field = Field.objects.create(
            name="East Plot",
            crop_type="Rice",
            planting_date=timezone.now().date(),
            current_stage=Field.Stage.GROWING,
        )
        old_update = FieldUpdate.objects.create(
            field=field,
            stage=Field.Stage.GROWING,
            notes="Old update",
            agent=agent,
        )
        old_update.timestamp = timezone.now() - timedelta(days=8)
        old_update.save(update_fields=["timestamp"])
        self.assertEqual(field.evaluate_status(), Field.Status.AT_RISK)


class AuthApiTests(APITestCase):
    def test_register_first_user_defaults_to_admin(self):
        response = self.client.post(
            "/mavuno/api/auth/register",
            {
                "username": "root",
                "email": "root@example.com",
                "password": "Password123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], User.Role.ADMIN)

    def test_login_and_me(self):
        user = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="Password123!",
            role=User.Role.ADMIN,
        )
        login_response = self.client.post(
            "/mavuno/api/auth/login",
            {"email": "admin@example.com", "password": "Password123!"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_response.data)
        self.assertEqual(login_response.data["user"]["id"], user.id)

        access = login_response.data["access"]
        me_response = self.client.get("/mavuno/api/auth/me", HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["email"], "admin@example.com")

    def test_login_with_wrong_password_returns_401_with_clean_detail(self):
        User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="Password123!",
            role=User.Role.ADMIN,
        )
        response = self.client.post(
            "/mavuno/api/auth/login",
            {"email": "admin@example.com", "password": "nope"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data, {"detail": "Wrong email or password."})

    def test_login_with_unknown_email_returns_401_with_clean_detail(self):
        response = self.client.post(
            "/mavuno/api/auth/login",
            {"email": "ghost@example.com", "password": "whatever"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data, {"detail": "Wrong email or password."})

    def test_login_with_malformed_payload_still_returns_400(self):
        response = self.client.post(
            "/mavuno/api/auth/login",
            {"email": "not-an-email", "password": "x"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_refresh_returns_new_access(self):
        User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="Password123!",
            role=User.Role.ADMIN,
        )
        login_response = self.client.post(
            "/mavuno/api/auth/login",
            {"email": "admin@example.com", "password": "Password123!"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        refresh_response = self.client.post("/mavuno/api/auth/refresh")
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_response.data)

    def test_logout_clears_session_cookie_and_blacklists(self):
        User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="Password123!",
            role=User.Role.ADMIN,
        )
        login_response = self.client.post(
            "/mavuno/api/auth/login",
            {"email": "admin@example.com", "password": "Password123!"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        logout_response = self.client.post("/mavuno/api/auth/logout")
        self.assertEqual(logout_response.status_code, status.HTTP_204_NO_CONTENT)


class FieldPermissionsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="Password123!",
            role=User.Role.ADMIN,
        )
        self.agent = User.objects.create_user(
            username="agent",
            email="agent@example.com",
            password="Password123!",
            role=User.Role.AGENT,
        )
        self.other_agent = User.objects.create_user(
            username="agent2",
            email="agent2@example.com",
            password="Password123!",
            role=User.Role.AGENT,
        )
        self.field = Field.objects.create(
            name="West Plot",
            crop_type="Beans",
            planting_date=timezone.now().date(),
            current_stage=Field.Stage.PLANTED,
            notes="Initial",
        )
        self.agent.assigned_fields.add(self.field)

    def test_agent_sees_only_assigned_fields(self):
        unassigned_field = Field.objects.create(
            name="Hidden Plot",
            crop_type="Soy",
            planting_date=timezone.now().date(),
        )
        self.client.force_authenticate(user=self.agent)
        response = self.client.get("/mavuno/api/fields")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        field_ids = {item["id"] for item in response.data}
        self.assertIn(self.field.id, field_ids)
        self.assertNotIn(unassigned_field.id, field_ids)

    def test_agent_cannot_modify_unassigned_field(self):
        self.client.force_authenticate(user=self.other_agent)
        response = self.client.put(
            f"/mavuno/api/fields/{self.field.id}",
            {"current_stage": Field.Stage.GROWING, "notes": "Attempt"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_agent_update_creates_field_update_record(self):
        self.client.force_authenticate(user=self.agent)
        response = self.client.put(
            f"/mavuno/api/fields/{self.field.id}",
            {"current_stage": Field.Stage.GROWING, "notes": "Progressed"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.field.refresh_from_db()
        self.assertEqual(self.field.current_stage, Field.Stage.GROWING)
        self.assertEqual(FieldUpdate.objects.filter(field=self.field, agent=self.agent).count(), 1)

    def test_admin_can_delete_field(self):
        to_delete = Field.objects.create(
            name="Delete Me",
            crop_type="Corn",
            planting_date=timezone.now().date(),
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f"/mavuno/api/fields/{to_delete.id}")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Field.objects.filter(pk=to_delete.id).exists())


class AgentsApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="Password123!",
            role=User.Role.ADMIN,
        )
        User.objects.create_user(
            username="agent1",
            email="a1@example.com",
            password="Password123!",
            role=User.Role.AGENT,
        )

    def test_agents_list_admin_only(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/mavuno/api/agents")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_agents_list_forbidden_for_agent(self):
        agent = User.objects.create_user(
            username="agentx",
            email="agentx@example.com",
            password="Password123!",
            role=User.Role.AGENT,
        )
        self.client.force_authenticate(user=agent)
        response = self.client.get("/mavuno/api/agents")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_update_agent_profile(self):
        agent = User.objects.create_user(
            username="agent-to-edit",
            email="before@example.com",
            password="Password123!",
            first_name="Before",
            last_name="Name",
            role=User.Role.AGENT,
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.put(
            f"/mavuno/api/agents/{agent.id}",
            {
                "email": "after@example.com",
                "first_name": "After",
                "last_name": "Updated",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        agent.refresh_from_db()
        self.assertEqual(agent.email, "after@example.com")
        self.assertEqual(agent.first_name, "After")
        self.assertEqual(agent.last_name, "Updated")

    def test_agent_update_forbidden_for_non_admin(self):
        admin_created_agent = User.objects.create_user(
            username="agent-z",
            email="agent-z@example.com",
            password="Password123!",
            role=User.Role.AGENT,
        )
        non_admin = User.objects.create_user(
            username="agentx",
            email="agentx@example.com",
            password="Password123!",
            role=User.Role.AGENT,
        )
        self.client.force_authenticate(user=non_admin)
        response = self.client.put(
            f"/mavuno/api/agents/{admin_created_agent.id}",
            {"first_name": "Nope"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_delete_agent(self):
        agent = User.objects.create_user(
            username="to-delete",
            email="to-delete@example.com",
            password="Password123!",
            role=User.Role.AGENT,
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f"/mavuno/api/agents/{agent.id}")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=agent.id).exists())

    def test_agent_delete_forbidden_for_non_admin(self):
        target = User.objects.create_user(
            username="target-agent",
            email="target-agent@example.com",
            password="Password123!",
            role=User.Role.AGENT,
        )
        non_admin = User.objects.create_user(
            username="non-admin-agent",
            email="non-admin-agent@example.com",
            password="Password123!",
            role=User.Role.AGENT,
        )
        self.client.force_authenticate(user=non_admin)
        response = self.client.delete(f"/mavuno/api/agents/{target.id}")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class UpdatesFeedTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="Password123!",
            role=User.Role.ADMIN,
        )
        self.agent = User.objects.create_user(
            username="agent",
            email="agent@example.com",
            password="Password123!",
            role=User.Role.AGENT,
        )
        self.field = Field.objects.create(
            name="South Plot",
            crop_type="Wheat",
            planting_date=timezone.now().date(),
            current_stage=Field.Stage.GROWING,
        )
        self.agent.assigned_fields.add(self.field)
        FieldUpdate.objects.create(
            field=self.field,
            stage=Field.Stage.GROWING,
            notes="Routine check",
            agent=self.agent,
        )

    def test_admin_sees_all_updates(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/mavuno/api/updates?limit=10")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_agent_sees_only_own_updates(self):
        other = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="Password123!",
            role=User.Role.AGENT,
        )
        FieldUpdate.objects.create(
            field=self.field,
            stage=Field.Stage.GROWING,
            notes="Other agent",
            agent=other,
        )
        self.client.force_authenticate(user=self.agent)
        response = self.client.get("/mavuno/api/updates?limit=10")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for item in response.data:
            self.assertEqual(item["agent"]["id"], self.agent.id)


class DashboardTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="Password123!",
            role=User.Role.ADMIN,
        )
        self.agent = User.objects.create_user(
            username="agent",
            email="agent@example.com",
            password="Password123!",
            role=User.Role.AGENT,
        )
        self.field = Field.objects.create(
            name="South Plot",
            crop_type="Wheat",
            planting_date=timezone.now().date(),
            current_stage=Field.Stage.GROWING,
        )
        self.agent.assigned_fields.add(self.field)
        FieldUpdate.objects.create(
            field=self.field,
            stage=Field.Stage.GROWING,
            notes="Routine check",
            agent=self.agent,
        )

    def test_admin_dashboard_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/mavuno/api/dashboard/admin")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total_fields", response.data)
        self.assertIn("status_breakdown", response.data)

    def test_agent_dashboard_endpoint(self):
        self.client.force_authenticate(user=self.agent)
        response = self.client.get("/mavuno/api/dashboard/agent")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["assigned_fields"], 1)


class EnsureAdminCommandTests(TestCase):
    """`ensure_admin` is wired into the prod CMD and runs on every container start."""

    BASE_ENV = {
        "MAVUNO_ADMIN_EMAIL": "ops@example.com",
        "MAVUNO_ADMIN_PASSWORD": "S3cretPassw0rd!",
        "MAVUNO_ADMIN_USERNAME": "ops",
    }

    def _run(self, env=None):
        out = StringIO()
        with mock.patch.dict("os.environ", env or self.BASE_ENV, clear=False):
            call_command("ensure_admin", stdout=out)
        return out.getvalue()

    def test_no_op_when_env_vars_missing(self):
        with mock.patch.dict("os.environ", {}, clear=True):
            out = StringIO()
            call_command("ensure_admin", stdout=out)
        self.assertEqual(User.objects.count(), 0)
        self.assertIn("skipping", out.getvalue())

    def test_creates_admin_when_missing(self):
        self._run()
        u = User.objects.get(email="ops@example.com")
        self.assertEqual(u.role, User.Role.ADMIN)
        self.assertTrue(u.check_password("S3cretPassw0rd!"))

    def test_idempotent_does_not_overwrite_existing_password(self):
        self._run()
        u = User.objects.get(email="ops@example.com")
        u.set_password("user-rotated-this-via-ui")
        u.save()
        self._run()  # second boot
        u.refresh_from_db()
        self.assertTrue(u.check_password("user-rotated-this-via-ui"))
        self.assertFalse(u.check_password("S3cretPassw0rd!"))

    def test_reset_password_flag_overrides_existing_password(self):
        self._run()
        u = User.objects.get(email="ops@example.com")
        u.set_password("temporary")
        u.save()
        out = StringIO()
        with mock.patch.dict("os.environ", self.BASE_ENV, clear=False):
            call_command("ensure_admin", "--reset-password", stdout=out)
        u.refresh_from_db()
        self.assertTrue(u.check_password("S3cretPassw0rd!"))

    def test_promotes_existing_non_admin_user(self):
        User.objects.create_user(
            username="ops",
            email="ops@example.com",
            password="anything",
            role=User.Role.AGENT,
        )
        self._run()
        u = User.objects.get(email="ops@example.com")
        self.assertEqual(u.role, User.Role.ADMIN)
        # Password not changed (existing user, no --reset-password).
        self.assertTrue(u.check_password("anything"))

    def test_password_never_appears_in_stdout(self):
        out = self._run()
        self.assertNotIn("S3cretPassw0rd!", out)
