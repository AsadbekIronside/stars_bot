const Joi = require('joi');
const {paymentSourcesList} = require('./enum');

module.exports.verifyPaymentPossibilitySchema = Joi.object({
    serviceId: Joi.number()
        .integer()
        .required(),

    timestamp: Joi.number()
        .integer()
        .required(),

    params: Joi.object({
        account: Joi.number()
            .integer()
            .required(),
    })
        .unknown(true)
        .required(),
});

module.exports.createPaymentTransactionSchema = Joi.object({
    serviceId: Joi.number()
        .integer()
        .required(),

    timestamp: Joi.number()
        .integer()
        .required(),

    transId: Joi.string()
        .uuid()
        .required(),

    params: Joi.object({
        account: Joi.number()
            .integer()
            .required(),
    })
        .unknown(true)
        .required(),

    amount: Joi.number()
        .integer()
        .min(1)
        .required(),
});

module.exports.confirmPaymentTransactionSchema = Joi.object({
    serviceId: Joi.number().integer().required(),
    timestamp: Joi.number().integer().required(),
    transId: Joi.string().uuid().required(),
    paymentSource: Joi.string().valid(...paymentSourcesList).required(),
    tariff: Joi.string().optional(),
    processingReferenceNumber: Joi.string().optional(),
    phone: Joi.string()
        .pattern(/^998\d{9}$/) // Uzbekistan phone format: 998 + 9 digits
        .required(),
});

module.exports.cancelPaymentTransactionSchema = Joi.object({
    serviceId: Joi.number().required(),
    timestamp: Joi.number().integer().required(),
    transId: Joi.string().uuid().required(),
});

module.exports.checkPaymentTransactionStatusSchema = Joi.object({
    serviceId: Joi.number().required(),
    timestamp: Joi.number().integer().required(),
    transId: Joi.string().uuid().required(),
});
