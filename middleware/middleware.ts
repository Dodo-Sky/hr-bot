import { Context, NextFunction } from 'grammy';
import { type ConversationFlavor } from '@grammyjs/conversations';
import { logger } from '../logger';

export async function disciplineCallBack(ctx: ConversationFlavor<Context>, next: NextFunction) {
  await ctx.answerCallbackQuery();
  const [prefix, scheduleId] = ctx.callbackQuery?.data!.split(':')!;
  logger.info({ prefix, scheduleId }, 'Discipline callback received');

  if (prefix === 'responceArr') {
    logger.info({}, 'Entering responceArr conversation');
    await ctx.conversation.enter('responceArr');
  }
  else if (prefix === 'decision') {
    logger.info({}, 'Entering decision conversation');
    await ctx.conversation.enter('decision');
  }
  else {
    logger.warn({ prefix }, 'Unknown prefix in discipline callback');
  }
  await next();
}

export async function yearBonusCallBack(ctx: ConversationFlavor<Context>, next: NextFunction) {
  await ctx.answerCallbackQuery();
  const [prefix, idAndYear] = await ctx.callbackQuery?.data!.split('+')!;
  if (prefix === 'cancel') {
    await ctx.conversation.enter('cancelYearBonus');
  }
  if (prefix === 'ok') {
    await ctx.conversation.enter('okYearBonus');
  }
  if (prefix === 'calculateBonus') {
    await ctx.conversation.enter('calculateBonus');
  }
  await next();
}

export async function publishedCallback(ctx: ConversationFlavor<Context>, next: NextFunction) {
  await ctx.answerCallbackQuery();
  const [prefix, staffId, year] = await ctx.callbackQuery?.data!.split('+')!;
  if (prefix === 'public') {
    await ctx.conversation.enter('publishedYearBonus');
  }
  await next();
}

export async function friendPayConfirmedCallback(ctx: ConversationFlavor<Context>, next: NextFunction) {
  await ctx.answerCallbackQuery();
  const [prefix, userId] = await ctx.callbackQuery?.data!.split('+')!;
  if (prefix === 'pay' || prefix === 'payKitchen') {
    await ctx.conversation.enter('friendPayConfirmed');
  }
  await next();
}

export async function friendPayAcceptedCallback(ctx: ConversationFlavor<Context>, next: NextFunction) {
  await ctx.answerCallbackQuery();
  const prefix = await ctx.callbackQuery?.data!.split('+')[0];
  if (prefix === 'согласие') {
    await ctx.conversation.enter('friendPayAccepted');
  }
  await next();
}

export async function friendPayCancelledCallback(ctx: ConversationFlavor<Context>, next: NextFunction) {
  await ctx.answerCallbackQuery();
  const prefix = await ctx.callbackQuery?.data!.split('+')[0];
  if (prefix === 'отказ') {
    await ctx.conversation.enter('friendPayCancelled');
  }
  await next();
}

export async function dismissedCallBack(ctx: ConversationFlavor<Context>) {
  await ctx.answerCallbackQuery();
  const [prefix, idContact] = await ctx.callbackQuery?.data!.split('+')!;
  if (prefix === 'Инструкции') {
    await ctx.conversation.enter('instructions');
  }
}