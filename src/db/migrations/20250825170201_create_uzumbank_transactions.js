const {dbTables} = require('../tables');
const {transactionStatuses} = require('../../paymentIntegrations/uzumbank/enum');

module.exports.up = knex => {
    return knex.schema.createTable(dbTables.UZUMBANK_TRANSACTIONS, t => {
        t.increments('id').primary();

        // relation to user transactions
        t.integer('user_transaction_id')
            .unsigned()
            .notNullable()
            .unique()
            .references('id')
            .inTable(dbTables.USER_TRANSACTIONS)
            .onDelete('CASCADE');

        t.enum('current_status', Object.values(transactionStatuses)).defaultTo(transactionStatuses.CREATED);
        // create
        t.integer('account_id').unsigned().notNullable();
        t.string('phone_number', 50).nullable();
        t.uuid('transaction_id').notNullable();
        t.integer('amount').unsigned().notNullable();
        t.bigint('created_timestamp_req').unsigned().notNullable();
        t.bigint('created_timestamp').unsigned().notNullable();

        // confirm
        t.bigint('confirmed_timestamp_req').unsigned().nullable();
        t.bigint('confirmed_timestamp').unsigned().nullable();
        t.string('payment_source').nullable();
        t.string('tariff').nullable();
        t.string('processing_reference_number').nullable();

        // cancel
        t.bigint('cancelled_timestamp_req').unsigned().nullable();
        t.bigint('cancelled_timestamp').unsigned().nullable();

        // indexes
        t.index('transaction_id');
        t.index('user_transaction_id');
    });
};

module.exports.down = knex => {
    return knex.schema.dropTableIfExists(dbTables.UZUMBANK_TRANSACTIONS);
};
