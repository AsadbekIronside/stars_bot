module.exports = {
    BOT_NAME: 'UZS Stars',
    BOT_TOKEN: '7805327704:AAGJAGwyGAGC9w8TnsFeRE3gh2HqsfV2Fyc',
    BOT_USERNAME: 'uzs_stars_bot',

    ADMIN_ID: 1419565211,

    CHATS_TO_SUBSCRIBE: [{ id: '@uzs_stars', link: 'https://t.me/uzs_stars' }],
    GROUP_ID: -1002616272122,
    ORDERS_CHANNEL_ID: -1002506345046,

    USER_BUTTONS: [
        ['buy_stars'],
        ['buy_premium'],
        ['offers', 'my_profile'],
        ['change_language'],
    ],
    ADMIN_BUTTONS: [
        ['send_post'],
        ['change_language'],
    ],

    TIMESTAMP_FORMAT: 'DD.MM.YYYY, HH:mm:ss',
    roles: {
        ADMIN: 'admin',
        USER: 'user',
    },
    DEFAULT_LANGUAGE: 'uz',
    GROUP_MESSAGES_LANGUAGE: 'uz',
    LANGUAGES: ['uz', 'en', 'ru'],

    stars: {
        ONE_STAR_PRICE: 218,
        MIN_STARS_QUANTITY: 50,
        MAX_STARS_QUANTITY: 5000,
        OPTIONS: [50, 100, 150, 200, 500, 1000, 2000, 5000],
    },
    paymentSystems: {
        payme: {
            BASE_URL: 'https://checkout.paycom.uz',
            MERCHANT_ID: '685ec86715461d903a41d64d',
            INVOICE_LIVE_TOKEN: '387026696:LIVE:685ec86715461d903a41d64d',
        },
        CALLBACK_URL: 'https://uzsstars.uz/api/v1/payment/result',
        click: {
            BASE_URL: "https://my.click.uz/services/pay",
            SERVICE_ID: 82879,
            MERCHANT_ID: 46106,
            MERCHANT_USER_ID: 64076,
            SECRET_KEY: "zbYSWtAUKMxED",
        }
    },
    BONUS_PER_REFERRAL: 4,
    BALANCE_RETRIEVE_OPTIONS: [75, 100, 125, 150],
};

