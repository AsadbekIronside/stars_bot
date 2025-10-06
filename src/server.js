const bot = require('./app');
const express = require('express');
const app = express();
const clickRoute = require('./paymentIntegrations/click/route');
const uzumbankRoute = require('./paymentIntegrations/uzumbank/route');
const UzumbankController = require('./paymentIntegrations/uzumbank/controller');
const uzumbankController = new UzumbankController();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use('/api/v1/payment/uzumbank', uzumbankRoute);
app.use('/api/v1/payment/click', clickRoute);

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        // JSON parsing error
        uzumbankController.returnError(
            res,
            UzumbankController.ERROR_CODES.JSON_PARSING_ERROR,
        );
    } else {
        next(err); // forward other errors
    }
});

// TG BOT WEBHOOK
const WEBHOOK_PATH = '/webhook';
const WEBHOOK_URL = 'https://uzsstars.uz' + WEBHOOK_PATH;

app.use(bot.webhookCallback(WEBHOOK_PATH));

app.listen(process.env.APP_PORT || 3000, async () => {
    await bot.telegram.setWebhook(WEBHOOK_URL);
    console.log(`Webhook set: ${WEBHOOK_URL}`);
});
