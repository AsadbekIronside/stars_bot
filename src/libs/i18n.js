const fs = require('fs');
const path = require('path');

function createI18nMiddleware(options = {}) {
    const {
        defaultLocale = 'en',
        directory = path.join(__dirname, 'locales'),
        localeExtractor = null, // Custom function to extract locale from request
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

    return function i18nMiddleware(req, res, next) {
        let currentLocale = defaultLocale;

        // Try custom locale extractor first
        if (localeExtractor && typeof localeExtractor === 'function') {
            currentLocale = localeExtractor(req) || defaultLocale;
        }
        // Extract from session
        else if (req.session && req.session.locale) {
            currentLocale = req.session.locale;
        }
        // Extract from user preferences
        else if (req.user && req.user.lang) {
            currentLocale = req.user.lang;
        }
        // Extract from query parameter
        else if (req.query && req.query.lang) {
            currentLocale = req.query.lang;
        }
        // Extract from Accept-Language header
        else if (req.headers && req.headers['accept-language']) {
            const langHeader = req.headers['accept-language'];
            const primaryLang = langHeader.split(',')[0].split('-')[0];
            if (locales[primaryLang]) {
                currentLocale = primaryLang;
            }
        }

        req.i18n = {
            changeLanguage: function (lang) {
                currentLocale = lang;
                if (req.session) {
                    req.session.locale = lang;
                }
                if (req.user) {
                    req.user.lang = lang;
                }
            },
            t: function (key, vars) {
                return t(currentLocale, key, vars);
            },
            language: currentLocale,
            getAvailableLocales: function () {
                return Object.keys(locales);
            },
        };

        // Also attach to response for convenience
        res.locals.i18n = req.i18n;
        res.locals.t = req.i18n.t;
        res.locals.language = currentLocale;

        return next();
    };
}

// Standalone i18n instance (no middleware)
function createI18n(options = {}) {
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

    let currentLocale = defaultLocale;

    return {
        changeLanguage: function (lang) {
            if (locales[lang]) {
                currentLocale = lang;
            }
        },
        t: function (key, vars = {}) {
            const messages = locales[currentLocale] || locales[defaultLocale] || {};
            let text = messages[key] || key;

            Object.entries(vars).forEach(([k, v]) => {
                text = text.replace(`{{${k}}}`, String(v));
            });

            return text;
        },
        getLanguage: function () {
            return currentLocale;
        },
        getAvailableLocales: function () {
            return Object.keys(locales);
        },
        reload: function () {
            loadLocales();
        },
    };
}

module.exports = {createI18nMiddleware, createI18n};