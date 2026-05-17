#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
REGISTRY="registry.digitalocean.com/odes-app"

echo "==> Building and pushing images from $REPO_ROOT"
docker buildx build --platform linux/amd64 --provenance=false \
  -f "$REPO_ROOT/app/services/api/Dockerfile" \
  -t "$REGISTRY/odes-api:latest" --push "$REPO_ROOT"

docker buildx build --platform linux/amd64 --provenance=false \
  -f "$REPO_ROOT/app/services/worker/Dockerfile" \
  -t "$REGISTRY/odes-worker:latest" --push "$REPO_ROOT"

docker buildx build --platform linux/amd64 --provenance=false \
  -f "$REPO_ROOT/app/services/ui/Dockerfile" \
  -t "$REGISTRY/odes-ui:latest" --push "$REPO_ROOT"

echo "==> Applying manifests"
kubectl apply -f "$REPO_ROOT/app/infra/k8s/rabbitmq.yaml"
kubectl apply -f "$REPO_ROOT/app/infra/k8s/api.yaml"
kubectl apply -f "$REPO_ROOT/app/infra/k8s/worker.yaml"
kubectl apply -f "$REPO_ROOT/app/infra/k8s/ui.yaml"

echo "==> Restarting custom deployments to pull latest images"
kubectl rollout restart deployment/api deployment/worker deployment/ui -n odes

echo "==> Waiting for rollout..."
kubectl rollout status deployment/rabbitmq -n odes --timeout=120s
kubectl rollout status deployment/api      -n odes --timeout=120s
kubectl rollout status deployment/worker   -n odes --timeout=120s
kubectl rollout status deployment/ui       -n odes --timeout=120s

echo ""
echo "==> Done. Services:"
kubectl get svc -n odes
