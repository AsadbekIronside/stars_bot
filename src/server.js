const bot = require('./app');
const express = require('express');
const app = express();
const uzumbankRoute = require('./paymentIntegrations/uzumbank/route');

app.use(express.json());
app.use(express.static(__dirname + '/public'));

app.use('/api/v1/payment/uzumbank', uzumbankRoute);

// TG BOT WEBHOOK
const WEBHOOK_PATH = '/webhook';
const WEBHOOK_URL = 'https://uzsstars.uz' + WEBHOOK_PATH;

app.use(bot.webhookCallback(WEBHOOK_PATH));

app.listen(process.env.APP_PORT || 3000, async () => {
    await bot.telegram.setWebhook(WEBHOOK_URL);
    console.log(`Webhook set: ${WEBHOOK_URL}`);
});
