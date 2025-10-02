const serviceTransaction = require("../../service/service.transaction");

class Controller {
    async prepare(req, res) {
        const {
            click_trans_id,
            service_id,
            click_paydoc_id,
            merchant_trans_id,
            amount,
            action,
            error,
            error_note,
            sign_time,
            sign_string
        } = req.body;

        try {
            const transaction = await serviceTransaction.readOneById(merchant_trans_id)

            if (transaction.is_paid) {
                res.json({
                    click_trans_id,
                    merchant_trans_id,
                    merchant_prepare_id,
                    error:-4,
                    error_note
                })

                return
            }

            if (action !== 0) {
                res.json({
                    click_trans_id,
                    merchant_trans_id,
                    merchant_prepare_id: merchant_trans_id,
                    error: 0,
                    error_note: "Success"
                })
            }

            res.json({
                click_trans_id,
                merchant_trans_id,
                merchant_prepare_id: merchant_trans_id,
                error: 0,
                error_note: "Success"
            })

        } catch (err) {

        }
    }
}

module.exports = new Controller()