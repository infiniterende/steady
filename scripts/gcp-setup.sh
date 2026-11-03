#!/usr/bin/env bash
# Sets up Steady's Google Cloud side: Cloud SQL (Postgres), a private photo bucket, and a service account.
# Safe to re-run: anything that already exists is skipped. Prints the environment variables at the end.
#   usage: bash scripts/gcp-setup.sh [project-id] [region]
set -euo pipefail

P="${1:-steady-513617}"
REGION="${2:-us-central1}"
INSTANCE=steady-db
DB=steady
DB_USER=steady_app
BUCKET="$P-journal"
SA_NAME=steady-vercel
SA="$SA_NAME@$P.iam.gserviceaccount.com"
OUT="${OUT:-./steady-gcp.env}"

gcloud config set project "$P" >/dev/null
gcloud services enable sqladmin.googleapis.com storage.googleapis.com iam.googleapis.com

# 1. Cloud SQL. No open networks: the app and migrations connect through Google's authenticated connector/proxy.
PW="$(openssl rand -hex 20)"
NEW_INSTANCE=0
if ! gcloud sql instances describe "$INSTANCE" >/dev/null 2>&1; then
  gcloud sql instances create "$INSTANCE" --database-version=POSTGRES_16 --region="$REGION" \
    --edition=ENTERPRISE --tier=db-f1-micro --storage-size=10GB --storage-type=SSD \
    --assign-ip --ssl-mode=ENCRYPTED_ONLY --root-password="$PW"
  NEW_INSTANCE=1
fi
gcloud sql databases describe "$DB" --instance "$INSTANCE" >/dev/null 2>&1 || gcloud sql databases create "$DB" --instance "$INSTANCE"
if gcloud sql users list --instance "$INSTANCE" --format='value(name)' | grep -qx "$DB_USER"; then
  gcloud sql users set-password "$DB_USER" --instance "$INSTANCE" --password "$PW"   # re-running resets the password
else
  gcloud sql users create "$DB_USER" --instance "$INSTANCE" --password "$PW"
fi

# 2. Private photo bucket, with CORS so the browser can upload and view through signed links.
gcloud storage buckets describe "gs://$BUCKET" >/dev/null 2>&1 || \
  gcloud storage buckets create "gs://$BUCKET" --location="$REGION" --uniform-bucket-level-access --public-access-prevention
CORS="$(mktemp)"
echo '[{"origin":["*"],"method":["PUT","GET"],"responseHeader":["Content-Type","x-goog-content-length-range"],"maxAgeSeconds":3600}]' > "$CORS"
gcloud storage buckets update "gs://$BUCKET" --cors-file="$CORS"

# 3. Service account the app uses: Cloud SQL Client + Storage Object Admin on the one bucket.
gcloud iam service-accounts describe "$SA" >/dev/null 2>&1 || gcloud iam service-accounts create "$SA_NAME" --display-name "Steady app"
gcloud projects add-iam-policy-binding "$P" --member "serviceAccount:$SA" --role roles/cloudsql.client --condition=None >/dev/null
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --member "serviceAccount:$SA" --role roles/storage.objectAdmin >/dev/null
KEY="$(mktemp)"; rm -f "$KEY"
gcloud iam service-accounts keys create "$KEY" --iam-account "$SA"
KEYJSON="$(python3 -c 'import json,sys;print(json.dumps(json.load(open(sys.argv[1]))))' "$KEY")"
rm -f "$KEY"

# 4. Output.
umask 077
cat > "$OUT" <<EOT
CLOUD_SQL_INSTANCE=$P:$REGION:$INSTANCE
CLOUD_SQL_USER=$DB_USER
CLOUD_SQL_DATABASE=$DB
CLOUD_SQL_PASSWORD=$PW
GCP_SERVICE_ACCOUNT_JSON=$KEYJSON
GCS_BUCKET=$BUCKET
EOT

cat <<EOT

Done. Wrote $OUT (contains secrets: paste into Vercel, then delete it).

Database URL for migrations (use through the Cloud SQL Auth Proxy):
  cloud-sql-proxy $P:$REGION:$INSTANCE --port 5433 --gcloud-auth &
  export DATABASE_URL="postgresql://$DB_USER:$PW@127.0.0.1:5433/$DB?sslmode=disable"
  export DIRECT_URL="\$DATABASE_URL"
  npx prisma migrate deploy

The app itself needs no URL: it connects with CLOUD_SQL_* via the connector.
EOT
[ "$NEW_INSTANCE" = 1 ] || echo "(Instance already existed; the database password was reset to the new one above.)"
