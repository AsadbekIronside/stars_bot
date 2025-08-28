const express = require('express');
const route = express.Router();

const UzumbankController = require('./controller');
const uzumbankController = new UzumbankController();

route.use(uzumbankController.middleware.bind(uzumbankController));

route.post('/check', uzumbankController.verifyPaymentPossibility.bind(uzumbankController));
route.post('/create', uzumbankController.createPaymentTransaction.bind(uzumbankController));
route.post('/confirm', uzumbankController.confirmPaymentTransaction.bind(uzumbankController));
route.post('/cancel', uzumbankController.cancelPaymentTransaction.bind(uzumbankController));
route.post('/status', uzumbankController.statusPaymentTransaction.bind(uzumbankController));

route.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        // JSON parsing error
        uzumbankController.returnError(
            res,
            UzumbankController.ERROR_CODES.JSON_PARSING_ERROR
        );
    } else {
        next(err); // forward other errors
    }
});

module.exports = route;