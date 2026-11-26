#!/usr/bin/env bash
# Builds Steady and deploys it to Google Cloud Run (the web app itself, not just the database).
#   SITE_URL=https://www.example.com bash scripts/deploy-cloud-run.sh [project-id] [region]
# Secrets (database password, service-account key, session-signing key) live in Secret Manager. The first
# run creates them from ./steady-gcp.env (written by scripts/gcp-setup.sh) and generates AUTH_SECRET.
# SITE_URL can be left out on the first run.
set -euo pipefail

P="${1:-steady-513617}"
REGION="${2:-us-central1}"
SERVICE=steady
SA="steady-vercel@$P.iam.gserviceaccount.com"
IMAGE="$REGION-docker.pkg.dev/$P/steady/web:$(date +%Y%m%d%H%M%S)"
ENV_FILE="${ENV_FILE:-./steady-gcp.env}"

gcloud config set project "$P" >/dev/null
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com

gcloud artifacts repositories describe steady --location "$REGION" >/dev/null 2>&1 || \
  gcloud artifacts repositories create steady --repository-format=docker --location "$REGION"

# Secrets: created once from the env file, never printed.
put_secret() { # name, value-file
  if gcloud secrets describe "$1" >/dev/null 2>&1; then gcloud secrets versions add "$1" --data-file="$2" >/dev/null
  else gcloud secrets create "$1" --data-file="$2" >/dev/null; fi
}
if [ -f "$ENV_FILE" ]; then
  T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
  python3 - "$ENV_FILE" "$T" <<'PY'
import sys
env = dict(l.rstrip("\n").split("=", 1) for l in open(sys.argv[1]) if "=" in l)
for k in ("CLOUD_SQL_PASSWORD", "GCP_SERVICE_ACCOUNT_JSON"):
    open(f"{sys.argv[2]}/{k}", "w").write(env[k])
PY
  put_secret steady-db-password "$T/CLOUD_SQL_PASSWORD"
  put_secret steady-sa-key "$T/GCP_SERVICE_ACCOUNT_JSON"
fi
if ! gcloud secrets describe steady-auth-secret >/dev/null 2>&1; then
  A="$(mktemp)"; openssl rand -hex 32 > "$A"; put_secret steady-auth-secret "$A"; rm -f "$A"
fi
# Stripe keys: pass STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET on the run where you first set or change them.
for pair in "steady-stripe-key:${STRIPE_SECRET_KEY:-}" "steady-stripe-webhook:${STRIPE_WEBHOOK_SECRET:-}"; do
  name="${pair%%:*}"; value="${pair#*:}"
  if [ -n "$value" ]; then V="$(mktemp)"; printf '%s' "$value" > "$V"; put_secret "$name" "$V"; rm -f "$V"; fi
  gcloud secrets describe "$name" >/dev/null 2>&1 || { echo "Missing secret $name: rerun with STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET set." >&2; exit 1; }
done
for s in steady-db-password steady-sa-key steady-auth-secret steady-stripe-key steady-stripe-webhook; do
  gcloud secrets add-iam-policy-binding "$s" --member "serviceAccount:$SA" --role roles/secretmanager.secretAccessor >/dev/null
done

SITE_URL="${SITE_URL:-https://$SERVICE-placeholder.invalid}"
gcloud builds submit --config cloudbuild.yaml \
  --substitutions "_IMAGE=$IMAGE" .

gcloud run deploy "$SERVICE" --image "$IMAGE" --region "$REGION" --allow-unauthenticated \
  --service-account "$SA" --min-instances 0 --max-instances 5 --memory 1Gi --cpu 1 \
  --set-env-vars "CLOUD_SQL_INSTANCE=$P:$REGION:steady-db,CLOUD_SQL_USER=steady_app,CLOUD_SQL_DATABASE=steady,GCS_BUCKET=$P-journal,NEXT_PUBLIC_SITE_URL=$SITE_URL,DATABASE_URL=postgresql://unused:unused@localhost:5432/unused,DIRECT_URL=postgresql://unused:unused@localhost:5432/unused" \
  --set-secrets "CLOUD_SQL_PASSWORD=steady-db-password:latest,GCP_SERVICE_ACCOUNT_JSON=steady-sa-key:latest,AUTH_SECRET=steady-auth-secret:latest,STRIPE_SECRET_KEY=steady-stripe-key:latest,STRIPE_WEBHOOK_SECRET=steady-stripe-webhook:latest"

echo; echo "Live at: $(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
