# mavuno

Monorepo with a Next.js frontend (`client/`) and a Django backend (`server/`), deployed to GCP Cloud Run via GitHub Actions.

## Local development

```bash
docker compose up --build
```

- Client: http://localhost:3000
- API:    http://localhost:8000/mavuno/api/
- Health: http://localhost:8000/mavuno/api/health/
- **OpenAPI / Swagger:** http://localhost:8000/mavuno/api/docs/ (ReDoc: `/mavuno/api/redoc/`, raw schema: `/mavuno/api/schema/`)

Hot reload works via bind mounts. Only rebuild when dependencies change.

The client uses a named volume for `node_modules`. On dependency changes, the dev container runs `pnpm install --frozen-lockfile` on startup ([`client/docker-entrypoint-dev.sh`](client/docker-entrypoint-dev.sh)) so the volume stays in sync. If anything still looks stale, run `docker compose down -v` once, then `docker compose up --build`.

### Common commands

```bash
docker compose logs -f client
docker compose logs -f server
docker compose exec server python manage.py makemigrations
docker compose exec server python manage.py migrate
docker compose exec server python manage.py seed_demo
docker compose exec server python manage.py createsuperuser
docker compose exec client pnpm add <pkg>
```

### SmartSeason Field Monitoring (assessment)

**Roles:** Admin (coordinator) and Field Agent. **Auth:** JWT access token in memory + refresh token in `httpOnly` cookie (`mavuno_refresh`, path `/`) so the Next.js app and API can share localhost across ports and middleware can gate `/admin/*` and `/agent/*`.

**Design decisions (short):**

- **JWT vs session:** SimpleJWT with refresh rotation + blacklist fits a SPA talking to a separate API origin; no CSRF on API routes (access token is not auto-sent by the browser).
- **Field ↔ agents:** Many-to-many; admins assign multiple agents per field.
- **No public signup:** First `POST /mavuno/api/auth/register` bootstraps an admin; further users are created by admins (`POST /mavuno/api/agents` or register while authenticated as admin).

**Computed field status (`active` / `at_risk` / `completed`):**

- `completed` if stage is `harvested`.
- `at_risk` if the latest `FieldUpdate` is older than 7 days, or update history shows out-of-order stages.
- otherwise `active`.

**Demo credentials** (after `seed_demo`):

| Role  | Email                 | Password      |
|-------|----------------------|---------------|
| Admin | admin@mavuno.local   | Password123!  |
| Agent | anne@mavuno.local    | Password123!  |
| Agent | juma@mavuno.local    | Password123!  |

**UI routes:** `/admin/...` and `/agent/...` (role layouts redirect if wrong role).

### Field create / merge / delete + realtime notifications

- **Merge is destructive.** Source fields are permanently deleted. All `FieldUpdate` rows from those sources are re-parented to the **new** field created by the merge so history stays attached to the surviving entity.
- **Notification kinds are bounded.** Only `field_deleted` and `field_merged_away` create inbox rows + SSE pushes. Changing agent assignments alone does **not** notify (yet).
- **In-process pub/sub.** SSE fan-out uses an in-memory `queue.Queue` per subscriber (`server/api/pubsub.py`). This matches a **single** Cloud Run instance per revision; horizontal scale-out needs Redis Pub/Sub, Postgres `LISTEN/NOTIFY`, or similar.
- **Cloud Run + SSE.** Prefer `--cpu-boost`, `--no-cpu-throttling`, and `--timeout=3600` on the **server** service so `/mavuno/api/events/stream` is not cut off by the default short request deadline or CPU throttling between requests.
- **Gunicorn + SSE.** Production image uses `gthread` with multiple threads so long-lived stream requests do not starve short API calls (`server/Dockerfile.prod`).
- **SSE auth.** The browser client uses `fetch()` + `ReadableStream` with an `Authorization: Bearer …` header so the JWT is never placed in the query string (native `EventSource` is not used).
- **Notifications are best-effort over SSE.** `GET /mavuno/api/notifications` is the source of truth; the client reconnects on visibility change and backs off on errors. Missed events while offline are recovered on next load.
- **Retention.** At most **50** notifications per recipient are kept; older rows are deleted when new ones are written.

### How they talk to each other locally

- Browser → `NEXT_PUBLIC_API_URL` = `http://localhost:8000`
- Next.js server-side (RSC, route handlers) → `API_URL_INTERNAL` = `http://server:8000`

---

## Production deploy (GCP Cloud Run)

Two independent Cloud Run services, one Artifact Registry repo, one Cloud SQL Postgres. CI is two separate path-filtered workflows so touching `client/` never redeploys `server/` and vice versa. Auth from GitHub → GCP uses **Workload Identity Federation** (OIDC) — no JSON keys stored anywhere.

### One-time bootstrap

```bash
# Requires: gcloud authenticated as an Owner on the project, openssl.
GITHUB_REPO="your-gh-owner/mavuno" ./scripts/gcp-bootstrap.sh
```

This creates:
- Artifact Registry repo (`mavuno`)
- Cloud SQL Postgres instance (`mavuno-db`), database, and user
- Secret Manager entries: `django-secret-key`, `db-password`, `database-url`
- Service accounts: `mavuno-deployer` (used by CI), `mavuno-runtime` (used by Cloud Run at runtime)
- Workload Identity Pool + Provider trusting your GitHub repo

It prints the values to paste into **GitHub → Settings → Secrets and variables → Actions → Variables**:

| Variable              | Purpose                                              |
|-----------------------|------------------------------------------------------|
| `GCP_PROJECT_ID`      | `mavuno-493709`                                      |
| `GCP_REGION`          | `europe-west1`                                       |
| `GCP_AR_REPO`         | Artifact Registry repo name (`mavuno`)               |
| `WIF_PROVIDER`        | Workload Identity provider resource path             |
| `DEPLOYER_SA`         | Service account the workflows impersonate            |
| `RUNTIME_SA`          | Service account Cloud Run services run as            |
| `CLOUDSQL_CONNECTION` | `project:region:instance` for `--add-cloudsql-instances` |
| `SERVER_URL`          | Cloud Run URL of the Django service (set after 1st deploy) |
| `CLIENT_URL`          | Cloud Run URL of the Next.js service (set after 1st deploy) |

No GitHub **Secrets** are needed — everything sensitive lives in GCP Secret Manager and is injected into Cloud Run with `--set-secrets`.

### First deploy (chicken-and-egg)

The client baker-bakes `NEXT_PUBLIC_API_URL` at build time; the server needs to know the client URL for CORS/CSRF. First time around:

1. Push to `main` (or run `Deploy server` manually). The workflow prints the server's Cloud Run URL.
2. Copy it into the `SERVER_URL` repo variable.
3. Push a client change (or run `Deploy client` manually). The workflow bakes `NEXT_PUBLIC_API_URL=SERVER_URL` and deploys.
4. Copy the printed client URL into the `CLIENT_URL` repo variable.
5. Re-run `Deploy server` so it picks up `CLIENT_URL` for `CORS_ALLOWED_ORIGINS` and `DJANGO_CSRF_TRUSTED_ORIGINS`.

After this, normal pushes Just Work — path filters route the change to the right workflow.

### Layout

```
mavuno/
├── client/
│   ├── Dockerfile          # dev (pnpm, hot reload)
│   └── Dockerfile.prod     # multi-stage, Next.js standalone
├── server/
│   ├── Dockerfile          # dev (runserver)
│   └── Dockerfile.prod     # gunicorn + WhiteNoise + migrate on boot
├── docker-compose.yml
├── scripts/
│   └── gcp-bootstrap.sh
└── .github/workflows/
    ├── deploy-server.yml   # on server/** changes
    └── deploy-client.yml   # on client/** changes
```

### Secret rotation

```bash
# Rotate Django SECRET_KEY
openssl rand -base64 60 | gcloud secrets versions add django-secret-key --data-file=-
gcloud run services update mavuno-server --region=europe-west1 # picks up :latest
```

### Known limitations / TODOs

- `DJANGO_ALLOWED_HOSTS=*` is fine behind Cloud Run ingress but tighten to your custom domain once you add one.
- Migrations run on container start, which is simple but means a slow deploy if a migration is heavy. For anything non-trivial, move migrations to a pre-deploy Cloud Run Job.
- Cloud SQL `db-f1-micro` is cheap but not for serious traffic; bump the tier when needed.
