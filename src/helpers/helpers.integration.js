const {paymentSystems} = require('../config');
const {paymentMethods} = require('../constant/constant.common');

class HelpersIntegration {
    getPaymeLink(amount, trans_id) {
        const callbackURL = paymentSystems.CALLBACK_URL + `?method=${paymentMethods.PAYME}&trans_id=${trans_id}`;

        const params = [
            `m=${paymentSystems.payme.MERCHANT_ID}`,
            `a=${amount * 100}`,
            `ac.order_id=${trans_id}`,
            'l=uz',
            'cr=UZS',
            `c=${callbackURL}`,
        ].join(';');

        const base64 = Buffer.from(params).toString('base64');
        return `${paymentSystems.payme.BASE_URL}/${base64}`;
    }
}

module.exports = new HelpersIntegration();