# Jaeger в Minikube с сервисами на Node.js

## Описание
Развертывание Jaeger в Minikube с двумя микросервисами на Node.js, которые:
1. Взаимодействуют между собой (service-a вызывает service-b)
2. Отправляют трейсы в Jaeger через OpenTelemetry
3. Демонстрируют распределенную трассировку

### Архитектура
- **Service A (Сервис расчёта)**: Принимает запросы, вызывает Service B для получения данных заказа, выполняет расчёт стоимости с учётом скидки
- **Service B (Сервис заказов)**: Возвращает данные о заказах из имитации базы данных
- **Jaeger**: Собирает и визуализирует трейсы от обоих сервисов

## Требования
- Minikube
- kubectl
- Docker

## Быстрый старт

### Автоматическое развертывание (рекомендуется)

Для быстрого развертывания всей системы используйте скрипт:

```bash
./deploy.sh
```

Скрипт автоматически:
- Проверит и запустит Minikube (если не запущен)
- Установит cert-manager
- Установит Jaeger Operator
- Развернет Jaeger instance
- Соберет Docker образы сервисов
- Развернет микросервисы

**Важно**: При первом запуске после установки Jaeger Operator может возникнуть ошибка webhook. Это нормально - webhook сервису нужно время для инициализации. Скрипт автоматически добавляет задержку, но если ошибка все же возникла, просто подождите 30 секунд и выполните:

```bash
kubectl apply -f k8s/jaeger-instance.yaml
kubectl apply -f k8s/services.yaml
```

### Автоматическая очистка

Для удаления всех развернутых ресурсов:

```bash
./cleanup.sh
```

Скрипт удалит:
- Микросервисы (service-a, service-b)
- Jaeger instance
- Jaeger Operator
- Namespace observability

Minikube останется запущенным. Для его остановки выполните `minikube stop`.

---

## Ручная установка

### 1. Запуск Minikube
```bash
minikube start --addons=ingress
```
Ingress нужен для вызовов

### 2. Установка cert-manager
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.3/cert-manager.yaml
```

Дождитесь готовности cert-manager:
```bash
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=300s
```

### 3. Развертывание Jaeger
```bash
# Создание namespace для observability
kubectl create namespace observability

# Установка Jaeger Operator
kubectl create -f https://github.com/jaegertracing/jaeger-operator/releases/download/v1.51.0/jaeger-operator.yaml -n observability

# Дождитесь готовности оператора
kubectl wait --for=condition=ready pod -l name=jaeger-operator -n observability --timeout=300s

# Развертывание Jaeger instance
kubectl apply -f k8s/jaeger-instance.yaml
```

Проверьте статус Jaeger:
```bash
kubectl get jaeger
kubectl get pods -l app.kubernetes.io/instance=simplest
```

### 4. Сборка и деплой сервисов
```bash
# Переключитесь на Docker окружение Minikube
eval $(minikube docker-env)

# Сборка образов
docker build -t service-a:latest services/service-a/
docker build -t service-b:latest services/service-b/

# Развертывание сервисов
kubectl apply -f k8s/services.yaml
```

Проверьте статус сервисов:
```bash
kubectl get pods
kubectl get services
```

## Проверка работы

### 1. Доступ к Jaeger UI
```bash
kubectl port-forward svc/simplest-query 16686:16686
```
Откройте в браузере: http://localhost:16686

### 2. Тестирование сервисов

#### Вариант 1: Через port-forward (рекомендуется)
```bash
# В отдельном терминале запустите port-forward
kubectl port-forward svc/service-a 8080:8080

# В другом терминале отправьте запрос
curl http://localhost:8080/
```

Ожидаемый ответ:
```json
{
  "service": "service-a (calculation)",
  "order": {
    "service": "service-b (orders)",
    "id": 2,
    "product": "Mouse",
    "quantity": 5,
    "price": 25,
    "timestamp": "2025-11-23T17:25:36.383Z",
    "status": "success"
  },
  "calculation": {
    "subtotal": 125,
    "discount": 0,
    "final_price": 125
  },
  "status": "success"
}
```

#### Вариант 2: Через kubectl exec
```bash
# Вызов service-a, который вызывает service-b
# Примечание: в контейнерах нет curl, используется wget
kubectl exec -it $(kubectl get pods -l app=service-a -o jsonpath='{.items[0].metadata.name}') -- wget -qO- http://service-a:8080
```

### 3. Просмотр трейсов в Jaeger UI

Сначала запустите port-forward для Jaeger UI (если еще не запущен):
```bash
kubectl port-forward svc/simplest-query 16686:16686
```

Затем:
1. Откройте http://localhost:16686
2. В выпадающем списке "Service" выберите `service-a`
3. Нажмите "Find Traces"
4. Выберите один из трейсов для детального просмотра
5. Вы увидите полный путь запроса: service-a → service-b

### 3. Анализ трейса

В трейсе вы увидите:
- **Spans от service-a**:
  - HTTP запрос к service-a
  - Операция `calculate-order`
  - HTTP запрос к service-b
- **Spans от service-b**:
  - HTTP запрос к service-b
  - Операция `get-order`

## Структура проекта
```
.
├── services/
│   ├── service-a/          # Сервис расчёта
│   │   ├── index.js        # Основной код
│   │   ├── package.json    # Зависимости Node.js
│   │   └── Dockerfile      # Docker образ
│   └── service-b/          # Сервис заказов
│       ├── index.js        # Основной код
│       ├── package.json    # Зависимости Node.js
│       └── Dockerfile      # Docker образ
├── k8s/
│   ├── jaeger-instance.yaml  # Конфигурация Jaeger
│   └── services.yaml         # Deployments и Services для микросервисов
└── README.md
```
