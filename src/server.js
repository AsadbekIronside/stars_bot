const bot = require('./app');
const controllerApi = require('./controller/controller.api');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static(__dirname + '/public'));

const WEBHOOK_PATH = '/webhook';
const WEBHOOK_URL = 'https://uzsstars.uz' + WEBHOOK_PATH;

app.use(bot.webhookCallback(WEBHOOK_PATH));

app.get('/api/v1/payment/result', controllerApi.getPaymentResult);

app.listen(process.env.APP_PORT || 3000, async () => {
    await bot.telegram.setWebhook(WEBHOOK_URL);
    console.log(`Webhook set: ${WEBHOOK_URL}`);
});
