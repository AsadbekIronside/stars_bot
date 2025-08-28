const ServiceBase = require('./service.base');
const {dbTables} = require('../db/tables');
const db = require('../db/db');

class UzumbankTransactionsService extends ServiceBase {
    constructor() {
        super(dbTables.UZUMBANK_TRANSACTIONS);
    }

    readByUserTransactionId(user_transaction_id) {
        return db
            .select(
                'a.is_paid',
                'b.*',
            )
            .from({a: dbTables.USER_TRANSACTIONS})
            .leftJoin({b: dbTables.UZUMBANK_TRANSACTIONS}, 'a.id', 'b.user_transaction_id')
            .where('a.id', user_transaction_id)
            .first();
    }

    updateByUserTransactionId(user_transaction_id, data) {
        return db(dbTables.USER_TRANSACTIONS)
            .update(data)
            .where('user_transaction_id', user_transaction_id);
    }
}

module.exports = new UzumbankTransactionsService();