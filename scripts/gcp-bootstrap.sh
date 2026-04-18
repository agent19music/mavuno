#!/usr/bin/env bash
# One-shot bootstrap for deploying mavuno to Cloud Run from GitHub Actions.
#
# What this creates (idempotent — safe to re-run):
#   - Enables required GCP APIs
#   - Artifact Registry repo for container images
#   - Cloud SQL for Postgres instance + database + user
#   - Secret Manager secrets (Django SECRET_KEY, Postgres password, DATABASE_URL)
#   - Two service accounts (deployer + runtime) with least-privilege roles
#   - Workload Identity Federation pool + provider trusting GitHub Actions
#
# Prerequisites:
#   - gcloud CLI installed and authenticated as a Project Owner
#   - openssl installed (for generating random secrets)
#
# Usage:
#   GITHUB_REPO="owner/repo" ./scripts/gcp-bootstrap.sh

set -euo pipefail

# --- Config (hardcoded for this project) -------------------------------------
PROJECT_ID="${PROJECT_ID:-mavuno-493709}"
REGION="${REGION:-europe-west1}"
REPO_NAME="${REPO_NAME:-mavuno}"                 # Artifact Registry repo name
GITHUB_REPO="${GITHUB_REPO:-YOUR_GITHUB_OWNER/mavuno}"  # e.g. foo/mavuno

DEPLOYER_SA_NAME="mavuno-deployer"
RUNTIME_SA_NAME="mavuno-runtime"
POOL_NAME="github-pool"
PROVIDER_NAME="github-provider"

CLOUDSQL_INSTANCE="mavuno-db"
CLOUDSQL_TIER="db-f1-micro"
CLOUDSQL_VERSION="POSTGRES_16"
DB_NAME="mavuno"
DB_USER="django"
# -----------------------------------------------------------------------------

if [[ "$GITHUB_REPO" == "YOUR_GITHUB_OWNER/mavuno" ]]; then
  echo "ERROR: set GITHUB_REPO=owner/repo before running (e.g. GITHUB_REPO=acme/mavuno $0)" >&2
  exit 1
fi

echo "==> Using project: $PROJECT_ID  region: $REGION  repo: $GITHUB_REPO"
gcloud config set project "$PROJECT_ID" --quiet

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
DEPLOYER_SA="${DEPLOYER_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_SA="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# --- Enable APIs -------------------------------------------------------------
echo "==> Enabling APIs (this can take a minute)"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  compute.googleapis.com \
  --quiet

# --- Artifact Registry -------------------------------------------------------
echo "==> Artifact Registry repo: $REPO_NAME"
if ! gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" &>/dev/null; then
  gcloud artifacts repositories create "$REPO_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --description="mavuno container images"
else
  echo "   (already exists)"
fi

# --- Cloud SQL (Postgres) ----------------------------------------------------
echo "==> Cloud SQL instance: $CLOUDSQL_INSTANCE"
if ! gcloud sql instances describe "$CLOUDSQL_INSTANCE" &>/dev/null; then
  gcloud sql instances create "$CLOUDSQL_INSTANCE" \
    --database-version="$CLOUDSQL_VERSION" \
    --tier="$CLOUDSQL_TIER" \
    --region="$REGION" \
    --storage-auto-increase \
    --backup-start-time=03:00
else
  echo "   (already exists)"
fi

CLOUDSQL_CONNECTION="$(gcloud sql instances describe "$CLOUDSQL_INSTANCE" --format='value(connectionName)')"
echo "   connection: $CLOUDSQL_CONNECTION"

echo "==> Database: $DB_NAME"
if ! gcloud sql databases describe "$DB_NAME" --instance="$CLOUDSQL_INSTANCE" &>/dev/null; then
  gcloud sql databases create "$DB_NAME" --instance="$CLOUDSQL_INSTANCE"
else
  echo "   (already exists)"
fi

# --- Secrets -----------------------------------------------------------------
echo "==> Secret Manager secrets"

ensure_secret() {
  local name="$1"
  local value="$2"
  if ! gcloud secrets describe "$name" &>/dev/null; then
    printf "%s" "$value" | gcloud secrets create "$name" --data-file=- --replication-policy=automatic
    echo "   created: $name"
  else
    echo "   exists:  $name (not overwriting)"
  fi
}

DB_PASSWORD_VALUE="$(openssl rand -base64 32 | tr -d '\n/+=' | cut -c1-32)"
DJANGO_SECRET_VALUE="$(openssl rand -base64 60 | tr -d '\n')"

ensure_secret "db-password" "$DB_PASSWORD_VALUE"
ensure_secret "django-secret-key" "$DJANGO_SECRET_VALUE"

# Re-read the actual stored password (important on re-run when we didn't overwrite).
DB_PASSWORD="$(gcloud secrets versions access latest --secret=db-password)"

# Ensure the DB user exists with that password (set-password is idempotent).
echo "==> Cloud SQL user: $DB_USER"
if gcloud sql users list --instance="$CLOUDSQL_INSTANCE" --format='value(name)' | grep -qx "$DB_USER"; then
  gcloud sql users set-password "$DB_USER" --instance="$CLOUDSQL_INSTANCE" --password="$DB_PASSWORD" --quiet
  echo "   password synced"
else
  gcloud sql users create "$DB_USER" --instance="$CLOUDSQL_INSTANCE" --password="$DB_PASSWORD"
fi

# DATABASE_URL using the Cloud SQL unix socket (what Cloud Run mounts).
DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${CLOUDSQL_CONNECTION}"
ensure_secret "database-url" "$DATABASE_URL"
# If database-url already existed but pointed at a stale password, refresh it.
CURRENT_DB_URL="$(gcloud secrets versions access latest --secret=database-url || true)"
if [[ "$CURRENT_DB_URL" != "$DATABASE_URL" ]]; then
  printf "%s" "$DATABASE_URL" | gcloud secrets versions add database-url --data-file=-
  echo "   refreshed: database-url (new version)"
fi

# --- Service accounts --------------------------------------------------------
echo "==> Service accounts"

ensure_sa() {
  local name="$1"
  local display="$2"
  if ! gcloud iam service-accounts describe "${name}@${PROJECT_ID}.iam.gserviceaccount.com" &>/dev/null; then
    gcloud iam service-accounts create "$name" --display-name="$display"
  else
    echo "   exists: $name"
  fi
}

ensure_sa "$DEPLOYER_SA_NAME" "mavuno CI deployer"
ensure_sa "$RUNTIME_SA_NAME"  "mavuno Cloud Run runtime"

grant() {
  local member="$1"
  local role="$2"
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="$member" --role="$role" --condition=None --quiet >/dev/null
}

echo "==> IAM bindings"
# Deployer: push images, deploy Cloud Run, act as the runtime SA.
grant "serviceAccount:${DEPLOYER_SA}" "roles/run.admin"
grant "serviceAccount:${DEPLOYER_SA}" "roles/artifactregistry.writer"
grant "serviceAccount:${DEPLOYER_SA}" "roles/iam.serviceAccountUser"

# Runtime: connect to Cloud SQL, read secrets.
grant "serviceAccount:${RUNTIME_SA}" "roles/cloudsql.client"
grant "serviceAccount:${RUNTIME_SA}" "roles/secretmanager.secretAccessor"

# Deployer must be able to impersonate the runtime SA when deploying.
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --member="serviceAccount:${DEPLOYER_SA}" \
  --role="roles/iam.serviceAccountUser" --quiet >/dev/null

# --- Workload Identity Federation -------------------------------------------
echo "==> Workload Identity Federation (GitHub OIDC)"

if ! gcloud iam workload-identity-pools describe "$POOL_NAME" --location=global &>/dev/null; then
  gcloud iam workload-identity-pools create "$POOL_NAME" \
    --location=global --display-name="GitHub Actions pool"
else
  echo "   pool exists: $POOL_NAME"
fi

if ! gcloud iam workload-identity-pools providers describe "$PROVIDER_NAME" \
     --location=global --workload-identity-pool="$POOL_NAME" &>/dev/null; then
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_NAME" \
    --location=global \
    --workload-identity-pool="$POOL_NAME" \
    --display-name="GitHub provider" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository=='${GITHUB_REPO}'"
else
  echo "   provider exists: $PROVIDER_NAME"
fi

WIF_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/providers/${PROVIDER_NAME}"

# Allow the GitHub repo to impersonate the deployer SA.
gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_SA" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/attribute.repository/${GITHUB_REPO}" \
  --quiet >/dev/null

# --- Output ------------------------------------------------------------------
cat <<EOF

============================================================================
Bootstrap complete. Set these as GitHub repository VARIABLES (Settings ->
Secrets and variables -> Actions -> Variables tab):

  GCP_PROJECT_ID        = ${PROJECT_ID}
  GCP_REGION            = ${REGION}
  GCP_AR_REPO           = ${REPO_NAME}
  WIF_PROVIDER          = ${WIF_PROVIDER}
  DEPLOYER_SA           = ${DEPLOYER_SA}
  RUNTIME_SA            = ${RUNTIME_SA}
  CLOUDSQL_CONNECTION   = ${CLOUDSQL_CONNECTION}

After the first successful server deploy, copy the Cloud Run URL and set:
  SERVER_URL            = https://mavuno-server-xxxx-ew.a.run.app

After the first successful client deploy, copy the Cloud Run URL and set:
  CLIENT_URL            = https://mavuno-client-xxxx-ew.a.run.app
Then re-run the server workflow so CORS/CSRF pick it up.

No GitHub secrets (keys) needed — auth is OIDC.
============================================================================
EOF
