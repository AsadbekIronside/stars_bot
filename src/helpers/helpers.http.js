const axios = require('axios');

const apiFragment = axios.create({
    baseURL: 'https://tg.parssms.info',
});

apiFragment.defaults.headers.common['api-key'] = `b53882bb-dfe7-4b12-8752-aa3a9c9496ec`;

class HelpersHttp {
    async getStars(username, quantity) {
        const res = await apiFragment.post('/v1/stars/payment', {
            query: username,
            quantity: String(quantity),
        });

        return res.data;
    }

    async searchUsernameForStars(username, quantity) {
        const res = await apiFragment.post('/v1/stars/search', {
            query: username,
            quantity: String(quantity),
        });

        return res.data;
    }

    async getPremium(username, months) {
        const res = await apiFragment.post('/v1/premium/payment', {
            query: username,
            months: String(months),
        });

        return res.data;
    }

    async searchUsernameForPremium(username, months) {
        const res = await apiFragment.post('/v1/premium/search', {
            query: username,
            months: String(months),
        });

        return res.data;
    }
}

module.exports = new HelpersHttp();