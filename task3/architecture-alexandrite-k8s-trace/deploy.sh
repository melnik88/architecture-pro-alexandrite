#!/bin/bash

set -e

echo "🚀 Развертывание Jaeger и микросервисов в Minikube"
echo ""

# Проверка Minikube
if ! minikube status > /dev/null 2>&1; then
    echo "❌ Minikube не запущен. Запускаем..."
    minikube start --addons=ingress
else
    echo "✅ Minikube уже запущен"
fi

echo ""
echo "📦 Установка cert-manager..."
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.3/cert-manager.yaml
echo "⏳ Ожидание готовности cert-manager..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=300s

echo ""
echo "📊 Установка Jaeger..."
kubectl create namespace observability --dry-run=client -o yaml | kubectl apply -f -
kubectl create -f https://github.com/jaegertracing/jaeger-operator/releases/download/v1.51.0/jaeger-operator.yaml -n observability --dry-run=client -o yaml | kubectl apply -f -
echo "⏳ Ожидание готовности Jaeger Operator..."
kubectl wait --for=condition=ready pod -l name=jaeger-operator -n observability --timeout=300s

echo ""
echo "🔧 Развертывание Jaeger instance..."
kubectl apply -f k8s/jaeger-instance.yaml
sleep 10
echo "⏳ Ожидание готовности Jaeger..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=simplest --timeout=300s

echo ""
echo "🐳 Сборка Docker образов..."
eval $(minikube docker-env)
docker build -t service-a:latest services/service-a/
docker build -t service-b:latest services/service-b/

echo ""
echo "🚢 Развертывание сервисов..."
kubectl apply -f k8s/services.yaml
echo "⏳ Ожидание готовности сервисов..."
kubectl wait --for=condition=ready pod -l app=service-a --timeout=300s
kubectl wait --for=condition=ready pod -l app=service-b --timeout=300s

echo ""
echo "✅ Развертывание завершено!"
echo ""
echo "📊 Статус подов:"
kubectl get pods
echo ""
echo "🌐 Для доступа к Jaeger UI выполните:"
echo "   kubectl port-forward svc/simplest-query 16686:16686"
echo "   Затем откройте: http://localhost:16686"
echo ""
echo "🧪 Для тестирования выполните:"
echo "   kubectl exec -it \$(kubectl get pods -l app=service-a -o jsonpath='{.items[0].metadata.name}') -- wget -qO- http://service-a:8080"
echo ""
