const helpersTelegram = require('../helpers/helpers.telegram');
const uiMain = require('../ui/ui.main');
const serviceUsers = require('../service/service.user');

const controllerMain = require('../controller/controller.main');
const controllerAdmin = require('../controller/controller.admin');
const controllerUser = require('../controller/controller.user');
const controllerPayment = require('../controller/controller.payment');
const { userSteps } = require('../constant/constant.userSteps');
const { receivedUsernameFor } = require('../constant/constant.common');

class BotMain {
    constructor(bot) {
        bot.command('start', async (ctx) => {
            await uiMain.menu(ctx, 'hello');
        });

        bot.action(/lang.+/, async (ctx) => {
            const [_, lang] = ctx.match[0].split('.');

            const user = ctx.session.user;

            ctx.i18n.changeLanguage(lang);

            await serviceUsers.updateOneById(user.id, { lang });

            await ctx.deleteMessage();
            await uiMain.menu(ctx);
        });

        // User accept offer to group or chanel
        bot.action('became_member', async (ctx) => {
            const chatId = ctx.update.callback_query.from.id;
            const isMember = await helpersTelegram.checkMembership(ctx, chatId);

            if (!isMember) {
                const message = await uiMain.removeKeyboardButtons(ctx, chatId);
                await ctx.telegram.deleteMessage(chatId, message.message_id);

                await helpersTelegram.offerMembership(chatId, ctx);

            } else {
                await ctx.deleteMessage();
                await uiMain.menu(ctx);
            }
        });

        bot.action(/^star\.\d+$/, async (ctx) => {
            const [_, starQuantity] = ctx.match[0].split('.');

            await controllerUser.showSelectedStarsInfo(ctx, +starQuantity, true);
        });

        bot.action(/^receiver_myself.+$/, async (ctx) => {
            await controllerUser.handleReceiverMyself(ctx);
        });

        bot.action(/^premium\.\d+$/, async (ctx) => {
            const [_, premiumId] = ctx.match[0].split('.');

            await controllerUser.showSelectedPremiumInfo(ctx, premiumId);
        });

        bot.action('pay_premium_by_star', async (ctx) => {
            await controllerUser.payForPremiumByStars(ctx);
        });

        bot.action('get_balance', async (ctx) => {
            await controllerUser.retrieveBalance(ctx);
        });

        bot.action(/get_balance_amount\.+/, async (ctx) => {
            await controllerUser.payUserBalance(ctx);
        });

        bot.on('pre_checkout_query', async (ctx) => {
            await ctx.answerPreCheckoutQuery(true);
        });

        bot.on('successful_payment', async (ctx) => {
            const payment = ctx.message.successful_payment;
            const transactionId = +payment.invoice_payload;
            const telegramPaymentId = payment.telegram_payment_charge_id;

            await controllerPayment.acceptPayment(ctx, {
                trans_id: transactionId,
                tg_payment_id: telegramPaymentId
            });
        });

        bot.action(/^back$/, async (ctx) => {
            await controllerUser.rollbackStep(ctx);
        });

        bot.action('cancel', async (ctx) => {
            await controllerUser.rollbackStep(ctx, -1);
        });

        bot.on('text', async (ctx) => {
            const text = ctx.message.text;

            const steps = ctx.session.user.steps;
            const step = steps[steps.length - 1];

            switch (text) {
                case ctx.i18n.t('change_language'):
                    await controllerMain.changeLang(ctx);
                    break;
                case ctx.i18n.t('buy_stars'):
                    await controllerUser.showStarsOptions(ctx);
                    break;
                case ctx.i18n.t('buy_premium'):
                    await controllerUser.showPremiumOptions(ctx);
                    break;
                case ctx.i18n.t('my_profile'):
                    await controllerUser.showMyProfile(ctx);
                    break;
                case ctx.i18n.t('offers'):
                    await controllerUser.sendOffers(ctx);
                    break;
                case ctx.i18n.t('send_post'):
                    await controllerAdmin.createPost(ctx);
                    break;
                case ctx.i18n.t('send'):
                    // await UserController.informPostSending(ctx);
                    // await UserController.sendPost(ctx);
                    break;
                case ctx.i18n.t('back'):
                    await controllerUser.rollbackStep(ctx);
                    break;
                case ctx.i18n.t('cancel'):
                    await uiMain.menu(ctx);
                    break;
                default:
                    switch (step?.key) {
                        case userSteps.STARS_OPTIONS:
                            await controllerUser.receiveStarsNumber(ctx, +text);
                            break;
                        case userSteps.SELECTED_STARS_OPTION:
                            await controllerUser.receiveUsername(ctx, text);
                            break;
                        case userSteps.STARS_PAYMENT_OPTIONS:
                            await controllerUser.showSelectedStarsInfo(ctx, text);
                            break;
                        case userSteps.SELECTED_PREMIUM_OPTION:
                            await controllerUser.receiveUsername(ctx, text, receivedUsernameFor.PREMIUM);
                            break;
                        case userSteps.PAY_RETRIEVING_BALANCE:
                            await controllerUser.receiveUsername(ctx, text, receivedUsernameFor.RETRIEVE_BALANCE);
                            break;
                        case userSteps.USER_OFFERS:
                            await controllerUser.receiveUserOffers(ctx, text);
                            break;
                        default:
                            await uiMain.menu(ctx);
                    }
            }
        });
    }
}

module.exports = BotMain;