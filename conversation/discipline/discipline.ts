import { type Context } from 'grammy';
import { type Conversation } from '@grammyjs/conversations';
import { getDataFromServer, postDataServer } from '../../services/api';
import { Schedule } from '../../type/type';
import { logger } from '../../logger';

async function getScheduleFromServer(scheduleId: string): Promise<Schedule | undefined> {
  const data = []
  const departmentNames = ['Тюмень', 'Курган']
  for (const departmentName of departmentNames) {
    const dataFromServer = await getDataFromServer(`${departmentName}/discipline`);
    logger.info({ departmentName, dataFromServer }, 'Fetched discipline data from server');
    data.push(...dataFromServer.map(schedule => ({...schedule, departmentName})));
  }
  return data.find((el: { scheduleId: string }) => el.scheduleId === scheduleId);
}

export async function responceArr(conversation: Conversation, ctx: Context) {
  const [prefix, scheduleId] = ctx.callbackQuery?.data!.split(':')!;

  const childLogger = logger.child({ prefix, scheduleId });

  const schedule = await conversation.external(() => getScheduleFromServer(scheduleId));
  if (!schedule) {
    childLogger.error({ scheduleId }, 'Schedule not found');
    return ctx.reply('Расписание не найдено. Пожалуйста, попробуйте позже.');
  }
  childLogger.info({ schedule }, 'Fetched schedule from server');

  let question = await ctx.reply(`Ответ по нарушению дисциплины за ${schedule.scheduledShiftStartAtLocal}`, {
    reply_markup: { force_reply: true },
  });
  const ctx1 = await conversation
    .waitForReplyTo(question.message_id, {
      otherwise: (ctx) =>
        ctx.reply('ОШИБКА! Ответьте на этот вопрос для продолжения работы', {
          reply_parameters: { message_id: question.message_id },
        }),
    })
    .andFor(':text', { otherwise: (ctx) => ctx.reply('Ответ принимается только текстом') });
  schedule.commentStaff = ctx1.msg.text;
  postDataServer('discipline', schedule);
  await ctx.reply(`Спасибо, Ваш ответ  <b>принят</b>`, {
    parse_mode: 'HTML',
    reply_parameters: { message_id: question.message_id, quote: question.text },
  });
}

export async function decision(conversation: Conversation, ctx: Context) {
  const [prefix, scheduleId] = await ctx.callbackQuery?.data!.split(':')!;
  const schedule: Schedule = await conversation.external(() => getScheduleFromServer(scheduleId));
  let question = await ctx.reply(`Ответ по нарушению дисциплины за ${schedule.scheduledShiftStartAtLocal}`, {
    reply_markup: { force_reply: true },
  });

  const ctx1 = await conversation
    .waitForReplyTo(question.message_id, {
      otherwise: (ctx) =>
        ctx.reply('ОШИБКА! Ответьте на этот вопрос для продолжения работы', {
          reply_parameters: { message_id: question.message_id },
        }),
    })
    .andFor(':text', { otherwise: (ctx) => ctx.reply('Ответ принимается только текстом') });
  schedule.managerDecision = ctx1.msg.text;
  postDataServer('discipline', schedule);
  await ctx.reply(`Спасибо, Ваш ответ  <b>принят</b>`, {
    parse_mode: 'HTML',
    reply_parameters: { message_id: question.message_id, quote: question.text },
  });
}
