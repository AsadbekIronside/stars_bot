const serviceTransaction = require('../service/service.transaction');
const db = require('../db/db');
const {productTypes, statuses, paymentMethods, bonusPurposeTypes} = require('../constant/constant.common');
const helpersHttp = require('../helpers/helpers.http');
const helpersTelegram = require('../helpers/helpers.telegram');
const {logError} = require('../logs/logs');
const {GROUP_MESSAGES_LANGUAGE, GROUP_ID, DEFAULT_LANGUAGE} = require('../config');
const serviceBonuses = require('../service/service.bonus');
const serviceUserBonuses = require('../service/service.userBonus');
const {helpersStars} = require('../helpers');
const uiMain = require('../ui/ui.main');
const {createI18n} = require('../libs/i18n');
const path = require('node:path');

class ControllerPayment {
    async #paymentForStars(t, transactionInfo) {
        const resp = await helpersHttp.getStars(
            transactionInfo.receiver,
            transactionInfo.quantity,
        );

        const matchingUserBonus = await serviceBonuses.readBonusMatchingStars(
            transactionInfo.quantity,
        );

        const userBonus = helpersStars.calculateBonus(
            transactionInfo.quantity,
            matchingUserBonus,
        );

        if (userBonus > 0) {
            await serviceUserBonuses.create({
                user_id: transactionInfo.user_id,
                transaction_id: transactionInfo.id,
                bonus: userBonus,
                source: bonusPurposeTypes.STARS,
            });
        }

        if (transactionInfo.sender_id) {
            const matchingRefBonus = await serviceBonuses.readBonusMatchingStars(
                transactionInfo.quantity,
                bonusPurposeTypes.REFERRAL,
            );

            const refBonus = helpersStars.calculateBonus(
                transactionInfo.quantity,
                matchingRefBonus,
            );

            if (refBonus > 0) {
                await serviceUserBonuses.create({
                    user_id: transactionInfo.sender_id,
                    transaction_id: transactionInfo.id,
                    bonus: refBonus,
                    source: bonusPurposeTypes.REFERRAL,
                });

                await helpersTelegram.sendMessageToUser(
                    transactionInfo.sender_chat_id,
                    t('referral_sender_bonus', {
                        buyer_name: [transactionInfo.first_name, transactionInfo.last_name].filter(Boolean).join(' '),
                        stars: refBonus,
                    }),
                ).catch(e => logError(e.toString()));
            }
        }

        const message = t('stars_given_success', {
            lng: transactionInfo.lang,
            quantity: transactionInfo.quantity,
        });

        return {
            message,
            resp,
        };
    }

    async #paymentForPremium(t, transactionInfo) {
        const resp = await helpersHttp.getPremium(
            transactionInfo.receiver,
            transactionInfo.quantity,
        );

        const message = t('premium_given_success', {
            lng: transactionInfo.lang,
            months: transactionInfo.quantity,
        });

        return {
            message,
            resp,
        };
    }

    async acceptPayment(ctx, {
        trans_id,
        tg_payment_id = null,
        payment_method = paymentMethods.PAYME,
    }) {

        let transactionInfo = await serviceTransaction.readWithUserInfo(trans_id);
        if (!transactionInfo || (payment_method === paymentMethods.PAYME && transactionInfo.tg_payment_id === tg_payment_id)) {
            return;
        }

        const t = ctx.i18n.t;
        let result;
        try {
            await serviceTransaction.updateOneById(trans_id, {
                payment_method,
                is_paid: true,
                paid_at: db.fn.now(),
                tg_payment_id,
            });

            if (transactionInfo.is_for === productTypes.STARS) {
                result = await this.#paymentForStars(t, transactionInfo);

            } else {
                result = await this.#paymentForPremium(t, transactionInfo);
            }

            const {resp, message} = result;

            const data = {
                transaction_id: resp.transaction_id || null,
                is_done: false,
            };

            if (resp.ok) {
                data['is_done'] = true;
                data['done_at'] = db.fn.now();
            }

            // send result to user
            await uiMain.menu(ctx, message);

            // delete payment message
            await helpersTelegram.deleteMessage(
                transactionInfo.chat_id,
                transactionInfo.user_message_id,
            ).catch(e => logError(e.toString()));

            await serviceTransaction.updateOneById(trans_id, data);
            transactionInfo = await serviceTransaction.readWithUserInfo(trans_id);

            const lang = ctx.i18n.language;
            await ctx.i18n.changeLanguage(GROUP_MESSAGES_LANGUAGE);

            await helpersTelegram.sendOrderToChannel(
                t,
                transactionInfo,
                data['is_done'] ? statuses.SUCCESS : statuses.FAILED,
                true,
            );

            await ctx.i18n.changeLanguage(lang);

        } catch (e) {
            logError(e.toString());

            const text = t('failed_purchase_text_for_user');
            await helpersTelegram.sendMessageToUser(
                transactionInfo.chat_id,
                text,
            );

            const adminText = t('failed_purchase_text_for_admin', {
                trans_id: transactionInfo.id,
                buyer_id: transactionInfo.user_id,
                buyer_name: [transactionInfo.first_name, transactionInfo.last_name, transactionInfo.username].filter(Boolean).join(' '),
                order: transactionInfo.is_for,
                quantity: transactionInfo.quantity,
                price: transactionInfo.payment_amount,
                receiver: transactionInfo.receiver,
            }).concat(`\n\n⚠️ Error: ${e.toString()}`);

            await helpersTelegram.sendMessageToUser(
                GROUP_ID,
                adminText,
            );
        }
    }

    async acceptPaymentClick(trans_id) {
        let transactionInfo = await serviceTransaction.readWithUserInfo(trans_id);
        if (!transactionInfo) {
            return;
        }

        try {
            let result;
            await serviceTransaction.updateOneById(trans_id, {
                payment_method: paymentMethods.CLICK,
                is_paid: true,
                paid_at: db.fn.now(),
            });

            // Create i18n instance for user's language
            const userI18n = createI18n({
                defaultLocale: transactionInfo.lang || DEFAULT_LANGUAGE,
                directory: path.join(__dirname, '../locales'),
            });

            // Process payment based on type
            if (transactionInfo.is_for === productTypes.STARS) {
                result = await this.#paymentForStars(userI18n.t.bind(userI18n), transactionInfo);
            } else {
                result = await this.#paymentForPremium(userI18n.t.bind(userI18n), transactionInfo);
            }

            const {resp, message} = result;

            const data = {
                transaction_id: resp.transaction_id || null,
                is_done: false,
            };

            if (resp.ok) {
                data['is_done'] = true;
                data['done_at'] = db.fn.now();
            }

            // Send result to user
            await helpersTelegram.sendMessageToUser(
                transactionInfo.chat_id,
                message,
            );

            // Delete payment message
            await helpersTelegram.deleteMessage(
                transactionInfo.chat_id,
                transactionInfo.user_message_id,
            ).catch(e => logError(e.toString()));

            // Update transaction
            await serviceTransaction.updateOneById(trans_id, data);
            transactionInfo = await serviceTransaction.readWithUserInfo(trans_id);

            // Create i18n instance for admin notifications (group language)
            const adminI18n = createI18n({
                defaultLocale: GROUP_MESSAGES_LANGUAGE,
                directory: path.join(__dirname, '../locales'),
            });

            // Send order notification to channel
            await helpersTelegram.sendOrderToChannel(
                adminI18n.t.bind(adminI18n),
                transactionInfo,
                data['is_done'] ? statuses.SUCCESS : statuses.FAILED,
                true,
            );

            return true;

        } catch (e) {
            logError(e.toString());

            // Create i18n instances for error messages
            const userI18n = createI18n({
                defaultLocale: transactionInfo?.lang || DEFAULT_LANGUAGE,
                directory: path.join(__dirname, '../locales'),
            });

            const adminI18n = createI18n({
                defaultLocale: GROUP_MESSAGES_LANGUAGE,
                directory: path.join(__dirname, '../locales'),
            });

            // Send error message to user
            const text = userI18n.t('failed_purchase_text_for_user');
            await helpersTelegram.sendMessageToUser(
                transactionInfo.chat_id,
                text,
            );

            // Send detailed error to admin group
            const adminText = adminI18n.t('failed_purchase_text_for_admin', {
                trans_id: transactionInfo.id,
                buyer_id: transactionInfo.user_id,
                buyer_name: [
                    transactionInfo.first_name,
                    transactionInfo.last_name,
                    transactionInfo.username,
                ].filter(Boolean).join(' '),
                order: transactionInfo.is_for,
                quantity: transactionInfo.quantity,
                price: transactionInfo.payment_amount,
                receiver: transactionInfo.receiver,
            }).concat(`\n\n⚠️ Error: ${e.toString()}`);

            await helpersTelegram.sendMessageToUser(
                GROUP_ID,
                adminText,
            );
            return false;
        }
    }
}

module.exports = new ControllerPayment();