const dayjs = require('dayjs');
const { TIMESTAMP_FORMAT, BOT_NAME, paymentSystems, BONUS_PER_REFERRAL } = require('../config');
const { Markup } = require('telegraf');
const { productTypes } = require('../constant/constant.common');
const helpersCommon = require('./helpers.common');

class HelpersUser {
    formatProfileInfo(t, balance, referrals_quantity, referral_link) {
        return [
            t('profile_info', {
                stars: helpersCommon.formatNumber(balance),
                count: referrals_quantity,
            }),
            // t('referral_ad_info', {count: BONUS_PER_REFERRAL}),
            `${t('referral_link')}:\n<code>${referral_link}</code>`,
        ].join('\n\n');
    }

    getLastStep(ctx) {
        const steps = ctx.session.user.steps;
        return steps[steps.length - 1];
    }

    formatUserOffer(t, user, text) {
        const full_name = (user.last_name ? user.last_name + ' ' : '') + user.first_name;

        return [
            `<b>${t('user_offers_title')}</b>`,
            `🆔 ${user.chat_id}`,
            `👤 ${full_name}`,
            `${t('username')}: @${user.username}`,
            `📝 ${text}`,
            `🕔 ${dayjs().format(TIMESTAMP_FORMAT)}`,
        ].join('\n\n');
    }

    extractId(text) {
        const match = text.match(/🆔\s*(\d+)/);
        return match ? Number(match[1]) : null;
    }

    async generatePaymentSystemsButtons(ctx, order) {
        const t = ctx.i18n.t;
        const quantity = helpersCommon.formatNumber(order.quantity);

        const product = order.is_for === productTypes.PREMIUM
            ? t('quantity_premium', { months: quantity })
            : t('quantity_stars', { quantity });

        const link = await ctx.telegram.createInvoiceLink({
            title: BOT_NAME,
            description: t('order', { order: product }),
            payload: order.id,
            provider_token: paymentSystems.payme.INVOICE_LIVE_TOKEN,
            currency: 'UZS',
            prices: [
                {
                    label: product,
                    amount: order.payment_amount * 100,
                },
            ],
            start_parameter: `buy-stars-${order.id}`,
            need_phone_number: false,
        });

        return [
            [
                Markup.button.url(t('pay'), link),
            ],
        ];
    }

    formatFullName(data) {
        return [
            data.first_name || '',
            data.last_name || '',
        ].join(' ').trim();
    }
}

module.exports = new HelpersUser();