// ВАЖНО: Инициализация трейсинга ДОЛЖНА быть первой!
require('./tracing');

const express = require('express');

const app = express();
const PORT = process.env.PORT || 8080;

// Имитация базы данных заказов
const orders = [
  { id: 1, product: 'Laptop', quantity: 2, price: 1200 },
  { id: 2, product: 'Mouse', quantity: 5, price: 25 },
  { id: 3, product: 'Keyboard', quantity: 3, price: 75 },
  { id: 4, product: 'Monitor', quantity: 1, price: 350 },
];

// Автоматическая инструментация создаст spans автоматически
app.get('/order', (req, res) => {
  try {
    // Выбираем случайный заказ
    const randomOrder = orders[Math.floor(Math.random() * orders.length)];

    // Имитация задержки обработки
    setTimeout(() => {
      const result = {
        service: 'service-b (orders)',
        ...randomOrder,
        timestamp: new Date().toISOString(),
        status: 'success',
      };

      res.json(result);
    }, Math.random() * 100 + 50); // 50-150ms задержка

  } catch (error) {
    res.status(500).json({
      service: 'service-b',
      error: error.message,
      status: 'failed',
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'service-b' });
});

app.listen(PORT, () => {
  console.log(`Service B listening on port ${PORT}`);
});
