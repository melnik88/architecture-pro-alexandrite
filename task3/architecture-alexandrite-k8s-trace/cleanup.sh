#!/bin/bash

set -e

echo "🧹 Очистка ресурсов Kubernetes..."
echo ""

echo "🗑️  Удаление сервисов..."
kubectl delete -f k8s/services.yaml --ignore-not-found=true

echo "🗑️  Удаление Jaeger instance..."
kubectl delete -f k8s/jaeger-instance.yaml --ignore-not-found=true

echo "🗑️  Удаление Jaeger Operator..."
kubectl delete -f https://github.com/jaegertracing/jaeger-operator/releases/download/v1.51.0/jaeger-operator.yaml -n observability --ignore-not-found=true

echo "🗑️  Удаление namespace observability..."
kubectl delete namespace observability --ignore-not-found=true

echo ""
echo "✅ Очистка завершена!"
echo ""
echo "💡 Для остановки Minikube выполните:"
echo "   minikube stop"
echo ""
echo "💡 Для полного удаления Minikube выполните:"
echo "   minikube delete"
echo ""
