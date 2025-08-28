const {logError} = require('../../logs/logs');
const {
    verifyPaymentPossibilitySchema,
    createPaymentTransactionSchema,
    confirmPaymentTransactionSchema,
    cancelPaymentTransactionSchema,
    checkPaymentTransactionStatusSchema,
} = require('./schema');
const dayjs = require('dayjs');
const {uzumbankConfig} = require('./config');
const uzumbankTransactionsService = require('../../service/service.uzumbankTransactions');
const userTransactionService = require('../../service/service.transaction');
const {transactionStatuses} = require('./enum');
const {paymentMethods} = require('../../constant/constant.common');

/**
 * Uzumbank Payment Controller
 * Handles payment operations including verification, creation, confirmation, and cancellation
 */
class UzumbankController {
    // Error codes constants
    static ERROR_CODES = {
        ACCESS_DENIED: '10001',
        JSON_PARSING_ERROR: '10002',
        INVALID_OPERATION: '10003',
        MISSING_REQUIRED_PARAMETERS: '10005',
        INVALID_SERVICE_ID: '10006',
        ADDITIONAL_PAYMENT_ATTRIBUTE_NOT_FOUND: '10007',
        PAYMENT_ALREADY_MADE: '10008',
        PAYMENT_CANCELLED: '10009',
        DATA_VERIFICATION_ERROR: '99999',
    };

    // HTTP status codes
    static HTTP_STATUS = {
        BAD_REQUEST: 400,
        OK: 200,
    };

    /**
     * Returns standardized error response
     * @param {Object} res - Express response object
     * @param {string} errorCode - Error code from ERROR_CODES
     * @param {Object} additionalDetails - Additional error details
     * @returns {Object} JSON error response
     */
    returnError(res, errorCode, additionalDetails = {}) {
        logError(`Uzumbank Error - ${errorCode}`);

        return res.status(UzumbankController.HTTP_STATUS.BAD_REQUEST).json({
            status: 'FAILED',
            errorCode,
            ...additionalDetails,
        });
    }

    /**
     * Returns standardized success response
     * @param {Object} res - Express response object
     * @param {Object} data - Response data
     * @returns {Object} JSON success response
     */
    returnSuccess(res, data) {
        return res.status(UzumbankController.HTTP_STATUS.OK).json(data);
    }

    /**
     * Extracts and validates Basic Auth credentials
     * @param {string} authorization - Authorization header
     * @returns {Object|null} Credentials object or null if invalid
     */
    extractCredentials(authorization) {
        try {
            if (!authorization?.startsWith('Basic ')) {
                return null;
            }

            const base64Credentials = authorization.split(' ')[1];
            const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
            const [username, password] = credentials.split(':');

            return {username, password};
        } catch (error) {
            return null;
        }
    }

    /**
     * Validates credentials against config
     * @param {Object} credentials - Username and password
     * @returns {boolean} True if valid
     */
    isValidCredentials({username, password}) {
        return username === uzumbankConfig.username && password === uzumbankConfig.password;
    }

    /**
     * Authentication and authorization middleware
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    middleware(req, res, next) {
        const authorization = req.headers.authorization;

        // Check for POST method
        if (req.method !== 'POST') {
            return this.returnError(res, UzumbankController.ERROR_CODES.INVALID_OPERATION);
        }

        // Extract credentials
        const credentials = this.extractCredentials(authorization);
        if (!credentials) {
            return this.returnError(res, UzumbankController.ERROR_CODES.ACCESS_DENIED);
        }

        // Validate credentials
        if (!this.isValidCredentials(credentials)) {
            return this.returnError(res, UzumbankController.ERROR_CODES.ACCESS_DENIED);
        }

        next();
    }

    /**
     * Validates transaction state and returns appropriate error if invalid
     * @param {Object} transactionInfo - Transaction information
     * @param {Object} res - Express response object
     * @returns {boolean} True if valid, false if error was returned
     */
    validateTransactionState(transactionInfo, res) {
        if (!transactionInfo) {
            this.returnError(res, UzumbankController.ERROR_CODES.INVALID_SERVICE_ID);
            return false;
        }

        if (transactionInfo.is_paid) {
            this.returnError(res, UzumbankController.ERROR_CODES.PAYMENT_ALREADY_MADE);
            return false;
        }

        if (transactionInfo.current_status === transactionStatuses.CANCELLED) {
            this.returnError(res, UzumbankController.ERROR_CODES.PAYMENT_CANCELLED);
            return false;
        }

        return true;
    }

    /**
     * Handles validation errors
     * @param {Object} error - Joi validation error
     * @param {Object} res - Express response object
     * @returns {Object|null} Error response or null if valid
     */
    handleValidationError(error, res) {
        if (error) {
            return this.returnError(res, UzumbankController.ERROR_CODES.MISSING_REQUIRED_PARAMETERS);
        }
        return null;
    }

    /**
     * Wraps async operations with error handling
     * @param {Function} operation - Async operation to execute
     * @param {Object} res - Express response object
     */
    async executeWithErrorHandling(operation, res) {
        try {
            await operation();
        } catch (error) {
            console.log(error);
            logError('Database operation failed:', error);
            this.returnError(res, UzumbankController.ERROR_CODES.DATA_VERIFICATION_ERROR);
        }
    }

    /**
     * Verify payment possibility
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async verifyPaymentPossibility(req, res) {
        const {error} = verifyPaymentPossibilitySchema.validate(req.body);
        if (this.handleValidationError(error, res)) return;

        const {serviceId, params: {account}} = req.body;

        await this.executeWithErrorHandling(async () => {
            const transactionInfo = await uzumbankTransactionsService.readByUserTransactionId(serviceId);

            if (!this.validateTransactionState(transactionInfo, res)) return;

            this.returnSuccess(res, {
                serviceId,
                timestamp: dayjs().valueOf(),
                status: 'OK',
                data: {
                    account: {
                        value: String(account),
                    },
                },
            });
        }, res);
    }

    /**
     * Create payment transaction
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async createPaymentTransaction(req, res) {
        const {error} = createPaymentTransactionSchema.validate(req.body);
        if (this.handleValidationError(error, res)) return;

        const {serviceId, timestamp, transId, params: {account}, amount} = req.body;

        await this.executeWithErrorHandling(async () => {
            let transactionInfo = await uzumbankTransactionsService.readByUserTransactionId(serviceId);

            if (!this.validateTransactionState(transactionInfo, res)) return;

            const transactionData = {
                current_status: transactionStatuses.CREATED,
                transaction_id: transId,
                account_id: account,
                amount,
            };

            if (transactionInfo?.id) {
                // Update existing transaction
                await uzumbankTransactionsService.updateOneById(transactionInfo.id, transactionData);
            } else {
                // Create new transaction
                await uzumbankTransactionsService.create({
                    ...transactionData,
                    user_transaction_id: serviceId,
                    created_timestamp_req: timestamp,
                });

                // Fetch the created transaction
                transactionInfo = await uzumbankTransactionsService.readByUserTransactionId(serviceId);
            }

            this.returnSuccess(res, {
                serviceId,
                transId,
                status: transactionStatuses.CREATED,
                transTime: transactionInfo.created_timestamp,
                data: {
                    account: {
                        value: String(account),
                    },
                },
                amount,
            });
        }, res);
    }

    /**
     * Confirm payment transaction
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async confirmPaymentTransaction(req, res) {
        const {error} = confirmPaymentTransactionSchema.validate(req.body);
        if (this.handleValidationError(error, res)) return;

        const {
            serviceId,
            timestamp,
            transId,
            paymentSource,
            tariff,
            processingReferenceNumber,
            phone,
        } = req.body;

        await this.executeWithErrorHandling(async () => {
            const transactionInfo = await uzumbankTransactionsService.readByUserTransactionId(serviceId);

            if (!this.validateTransactionState(transactionInfo, res)) return;

            const updateData = {
                current_status: transactionStatuses.CONFIRMED,
                confirmed_timestamp_req: timestamp,
                confirmed_timestamp: dayjs().valueOf(),
                payment_source: paymentSource,
                tariff: tariff ?? null,
                processing_reference_number: processingReferenceNumber ?? null,
                phone_number: phone ?? null,
            };

            await uzumbankTransactionsService.updateByUserTransactionId(serviceId, updateData);
            await userTransactionService.updateOneById(serviceId, {
                is_paid: true,
                paid_at: dayjs().toDate(),
                payment_method:paymentMethods.UZUMBANK
            });

            this.returnSuccess(res, {
                serviceId,
                transId,
                status: transactionStatuses.CONFIRMED,
                confirmTime: transactionInfo.confirmed_timestamp,
                amount: transactionInfo.amount,
            });
        }, res);
    }

    /**
     * Cancel payment transaction
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async cancelPaymentTransaction(req, res) {
        const {error} = cancelPaymentTransactionSchema.validate(req.body);
        if (this.handleValidationError(error, res)) return;

        const {serviceId, timestamp, transId} = req.body;

        await this.executeWithErrorHandling(async () => {
            const transactionInfo = await uzumbankTransactionsService.readByUserTransactionId(serviceId);

            if (!this.validateTransactionState(transactionInfo, res)) return;

            const cancelledTimestamp = dayjs().valueOf();
            const updateData = {
                current_status: transactionStatuses.CANCELLED,
                cancelled_timestamp_req: timestamp,
                cancelled_timestamp: cancelledTimestamp,
            };

            await uzumbankTransactionsService.updateByUserTransactionId(serviceId, updateData);

            this.returnSuccess(res, {
                serviceId,
                transId,
                status: transactionStatuses.CANCELLED,
                confirmTime: cancelledTimestamp,
                amount: transactionInfo.amount,
            });
        }, res);
    }

    /**
     * Get payment transaction status
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async statusPaymentTransaction(req, res) {
        const {error} = checkPaymentTransactionStatusSchema.validate(req.body);
        if (this.handleValidationError(error, res)) return;

        const {serviceId, transId} = req.body;

        await this.executeWithErrorHandling(async () => {
            const transactionInfo = await uzumbankTransactionsService.readByUserTransactionId(serviceId);

            if (!transactionInfo) {
                return this.returnError(res, UzumbankController.ERROR_CODES.INVALID_SERVICE_ID);
            }

            this.returnSuccess(res, {
                serviceId,
                transId,
                status: transactionInfo.current_status,
                transTime: transactionInfo.created_timestamp,
                amount: transactionInfo.amount,
            });
        }, res);
    }
}

module.exports = UzumbankController;