const serviceTransaction = require('../service/service.transaction');
const helpersHttp = require('../helpers/helpers.http');
const helpersTelegram = require('../helpers/helpers.telegram');
const {productTypes, statuses} = require('../constant/constant.common');
const {logError} = require('../logs/logs');
const db = require('../db/db');

class ControllerApi {
    async getPaymentResult(req, res) {
        try {
            const {trans_id, method} = req.query;

            const transactionInfo = await serviceTransaction.readWithChatId(trans_id);

            if (transactionInfo) {
                let resp, message;

                await serviceTransaction.updateOneById(trans_id, {
                    payment_method: method,
                    is_paid: true,
                    paid_at: db.fn.now(),
                });

                if (transactionInfo.is_for === productTypes.STARS) {
                    resp = await helpersHttp.getStars(
                        transactionInfo.receiver,
                        transactionInfo.quantity,
                    );

                    message = i18next.t('stars_given_success', {
                        lng: transactionInfo.lang,
                        quantity: transactionInfo.quantity,
                    });

                } else {
                    resp = await helpersHttp.getPremium(
                        transactionInfo.receiver,
                        transactionInfo.quantity,
                    );

                    message = i18next.t('premium_given_success', {
                        lng: transactionInfo.lang,
                        months: transactionInfo.quantity,
                    });
                }

                const data = {
                    transaction_id: resp.transaction_id || null,
                    is_done: false,
                };

                if (resp.ok) {
                    data['is_done'] = true;
                    data['done_at'] = db.fn.now();
                }

                await helpersTelegram.sendMessageToUser(
                    transactionInfo.chat_id,
                    message,
                );

                await helpersTelegram.deleteMessage(
                    transactionInfo.chat_id,
                    transactionInfo.message_id,
                ).catch(e => logError(e.toString()));

                await serviceTransaction.updateOneById(trans_id, data);
                const transaction = await serviceTransaction.readWithChatId(trans_id);

                await helpersTelegram.sendOrderToChannel(
                    i18next.t,
                    transaction,
                    data['is_done'] ? statuses.SUCCESS : statuses.FAILED,
                    true,
                );
            }

            res.status(200).send('Success');

        } catch (e) {
            logError(e.toString());

            res.status(500).send('Server error');
        }
    }
}

module.exports = new ControllerApi();