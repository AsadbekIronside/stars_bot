const fs = require('fs');
const path = require('path');

function createI18nMiddleware(options = {}) {
    const {
        defaultLocale = 'en',
        directory = path.join(__dirname, 'locales'),
    } = options;

    const locales = {};

    function loadLocales() {
        const files = fs.readdirSync(directory);
        files.forEach((file) => {
            const locale = path.basename(file, '.json');
            const content = fs.readFileSync(path.join(directory, file), 'utf8');
            locales[locale] = JSON.parse(content);
        });
    }

    loadLocales();

    function t(locale, key, vars = {}) {
        const messages = locales[locale] || locales[defaultLocale] || {};
        let text = messages[key] || key;

        Object.entries(vars).forEach(([k, v]) => {
            text = text.replace(`{{${k}}}`, String(v));
        });

        return text;
    }

    return function i18nMiddleware(ctx, next) {
        let currentLocale = defaultLocale;

        if (ctx.session && ctx.session.user && ctx.session.user.lang) {
            currentLocale = ctx.session.user.lang;
        }

        ctx.i18n = {
            changeLanguage: function (lang) {
                currentLocale = lang;
                if (ctx.session && ctx.session.user) {
                    ctx.session.user.lang = lang;
                }
            },
            t: function (key, vars) {
                return t(currentLocale, key, vars);
            },
            language: currentLocale,
        };

        return next();
    };
}

module.exports = {createI18nMiddleware};
