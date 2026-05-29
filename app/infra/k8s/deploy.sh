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

echo "==> Deleting manifests"
kubectl delete -f "$REPO_ROOT/app/infra/k8s/rabbitmq.yaml"
kubectl delete -f "$REPO_ROOT/app/infra/k8s/api.yaml"
kubectl delete -f "$REPO_ROOT/app/infra/k8s/worker.yaml"
kubectl delete -f "$REPO_ROOT/app/infra/k8s/ui.yaml"

echo "==> Applying manifests"
kubectl apply -f "$REPO_ROOT/app/infra/k8s/rabbitmq.yaml"
kubectl apply -f "$REPO_ROOT/app/infra/k8s/api.yaml"
kubectl apply -f "$REPO_ROOT/app/infra/k8s/worker.yaml"
kubectl apply -f "$REPO_ROOT/app/infra/k8s/ui.yaml"
# keda.yaml is intentionally not applied — worker runs at replicas: 1 permanently.
# The node has enough resources (8 GiB / 4 vCPU) to keep the worker alive at all times.

echo ""
echo "==> Done. Services:"
kubectl get svc -n odes
