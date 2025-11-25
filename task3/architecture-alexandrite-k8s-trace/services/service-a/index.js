// ВАЖНО: Инициализация трейсинга ДОЛЖНА быть первой!
require('./tracing');

const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8080;
const SERVICE_B_URL = process.env.SERVICE_B_URL || 'http://service-b:8080';

// Автоматическая инструментация создаст spans автоматически
app.get('/', async (req, res) => {
  try {
    // Вызов service-b - HttpInstrumentation автоматически создаст span и передаст context
    const response = await axios.get(`${SERVICE_B_URL}/order`, {
      timeout: 5000,
    });

    const orderData = response.data;

    // Расчёт стоимости
    const quantity = orderData.quantity || 1;
    const price = orderData.price || 100;
    const total = quantity * price;
    const discount = total > 500 ? 0.1 : 0;
    const finalPrice = total * (1 - discount);

    const result = {
      service: 'service-a (calculation)',
      order: orderData,
      calculation: {
        subtotal: total,
        discount: discount * 100,
        final_price: finalPrice,
      },
      status: 'success',
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({
      service: 'service-a',
      error: error.message,
      status: 'failed',
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'service-a' });
});

app.listen(PORT, () => {
  console.log(`Service A listening on port ${PORT}`);
  console.log(`Service B URL: ${SERVICE_B_URL}`);
});
