#!/bin/bash
# ===================================================
# Cloud Run Deployment Script for PharmaEC Backend
# ===================================================

set -e

# Configuration - UPDATE THESE VALUES
PROJECT_ID="${PROJECT_ID:-your-gcp-project-id}"
REGION="${REGION:-asia-south1}"
SERVICE_NAME="pharmaec-backend"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "=========================================="
echo "Deploying PharmaEC Backend to Cloud Run"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "=========================================="

# Authenticate (only needed first time)
# gcloud auth login
# gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com run.googleapis.com secretmanager.googleapis.com sqladmin.googleapis.com --project=${PROJECT_ID}

# Build and push Docker image
echo "Building and pushing Docker image..."
gcloud builds submit --tag ${IMAGE_NAME}:latest .

# Create secrets if they don't exist
echo "Setting up secrets..."
if ! gcloud secrets describe database-url --project=${PROJECT_ID} >/dev/null 2>&1; then
    echo "Creating database-url secret..."
    gcloud secrets create database-url --replication-policy="automatic" --project=${PROJECT_ID}
    echo "Run: echo 'your-db-url' | gcloud secrets versions add database-url --data-file=-"
fi

if ! gcloud secrets describe secret-key --project=${PROJECT_ID} >/dev/null 2>&1; then
    echo "Creating secret-key secret..."
    gcloud secrets create secret-key --replication-policy="automatic" --project=${PROJECT_ID}
    echo "Run: echo 'your-secret-key' | gcloud secrets versions add secret-key --data-file=-"
fi

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME}:latest \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --port 8000 \
    --cpu 2 \
    --memory 1Gi \
    --min-instances 1 \
    --max-instances 10 \
    --timeout 300 \
    --concurrency 80 \
    --cpu-throttling \
    --set-env-vars "ENVIRONMENT=production,DEBUG=False,PORT=8000" \
    --set-secrets "DATABASE_URL=database-url:latest,SECRET_KEY=secret-key:latest" \
    --project=${PROJECT_ID}

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)' --project=${PROJECT_ID})

echo "=========================================="
echo "Deployment Complete!"
echo "Service URL: ${SERVICE_URL}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update CORS_ORIGINS in environment to include frontend URL"
echo "2. Set up Cloud SQL if not done"
echo "3. Run database migrations"
echo "4. Add secrets: gcloud secrets versions add database-url --data-file=- <<< 'postgresql://...'"
