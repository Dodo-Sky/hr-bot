import { Bot, GrammyError, HttpError, type Context } from 'grammy';
import { type ConversationFlavor, conversations, createConversation } from '@grammyjs/conversations';
import * as disciplineProgramm from './conversation/discipline/discipline';
import * as yearBonus from './conversation/yearBonus/yearbonus';
import * as dismissedProgramm from './conversation/dismissed/dismissed';
import * as payAcceptedProgramm from './conversation/friend/pay-accepted';
import * as payCancelledProgramm from './conversation/friend/pay-cancelled';
import * as payConfirmedProgramm from './conversation/friend/pay-confirmed';
import { calculateBonus } from './conversation/yearBonus/calculateBonus';
import * as middleware from './middleware/middleware';
import { setMyCommands } from './commands/commands';
import { friend, discipline, start, message_help } from './commands/handlers';

import { autoRetry } from '@grammyjs/auto-retry';
import { FileAdapter } from '@grammyjs/storage-file';
import { message_kitchen } from "./conversation/message/message_kitchen";
import { message_courier } from "./conversation/message/message_courier";
import { BOT_TOKEN } from './config';

const bot = new Bot<ConversationFlavor<Context>>(BOT_TOKEN);
bot.api.config.use(
  autoRetry({
    rethrowInternalServerErrors: true, // не обрабатывать внутренние ошибки сервера
  }),
);
bot.use(
  conversations({
    storage: new FileAdapter({ dirName: 'dialogs-data' }),
  }),
);

// установить завершение диалогов чезе 10 минут
const oneHourInMilliseconds = 10 * 60 * 1000;
// установка диалогов в настройки бота
// программа discipline
bot.use(createConversation(disciplineProgramm.responceArr, { maxMillisecondsToWait: oneHourInMilliseconds }));
bot.use(createConversation(disciplineProgramm.decision, { maxMillisecondsToWait: oneHourInMilliseconds }));

// программа yearBonus
bot.use(createConversation(yearBonus.cancelYearBonus, { maxMillisecondsToWait: oneHourInMilliseconds }));
bot.use(createConversation(yearBonus.publishedYearBonus, { maxMillisecondsToWait: oneHourInMilliseconds }));
bot.use(createConversation(yearBonus.okYearBonus, { maxMillisecondsToWait: oneHourInMilliseconds }));
bot.use(createConversation(calculateBonus, { maxMillisecondsToWait: oneHourInMilliseconds }));

// программа dismissed
bot.use(createConversation(dismissedProgramm.instructions, { maxMillisecondsToWait: oneHourInMilliseconds }));

// программа friend
bot.use(createConversation(payAcceptedProgramm.friendPayAccepted, { maxMillisecondsToWait: oneHourInMilliseconds }));
bot.use(createConversation(payCancelledProgramm.friendPayCancelled, { maxMillisecondsToWait: oneHourInMilliseconds }));
bot.use(createConversation(payConfirmedProgramm.friendPayConfirmed, { maxMillisecondsToWait: oneHourInMilliseconds }));

// программа message
bot.use(createConversation(message_kitchen, { maxMillisecondsToWait: oneHourInMilliseconds }));
bot.use(createConversation(message_courier, { maxMillisecondsToWait: oneHourInMilliseconds }));

// запуск обработчиков по программам
bot.on('callback_query:data', middleware.friendPayAcceptedCallback);
bot.on('callback_query:data', middleware.friendPayCancelledCallback);
bot.on('callback_query:data', middleware.friendPayConfirmedCallback);
bot.on('callback_query:data', middleware.disciplineCallBack);
bot.on('callback_query:data', middleware.yearBonusCallBack);
bot.on('callback_query:data', middleware.publishedCallback);
bot.on('callback_query:data', middleware.dismissedCallBack);

// запуск команд
setMyCommands(bot);
bot.command('friend', async (ctx) => await ctx.reply(friend()));
bot.command('discipline', async (ctx) =>  await ctx.reply(discipline()));
bot.command('start', async (ctx) => await ctx.reply(start()));
bot.command('message_help', async (ctx) => await ctx.reply(message_help()));

bot.command('message_kitchen', async (ctx) => {
  await ctx.conversation.enter('message_kitchen');
});

bot.command('message_courier', async (ctx) => {
  await ctx.conversation.enter('message_courier');
});

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Ошибка при обработке обновления ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error('Внешняя Ошибка в запросе:', e.description);
  } else if (e instanceof HttpError) {
    console.error('Не удалось связаться с Telegram:', e);
  } else {
    console.error('Неизвестная ошибка:', e);
  }
});

bot.start();
console.log('Бот запущен');