import { type Context } from 'grammy';
import { type Conversation } from '@grammyjs/conversations';
import { postDataServer } from '../../services/api';
import { logger } from '../../logger';
import { format, parseISO } from 'date-fns';
import { URL } from '../../services/api';

interface Discipline {
  id: string;
  schedule_id: string;
  scheduled_shift_start_at_local: string;
  scheduled_shift_end_at_local: string;
  comment_staff: string | null;
  manager_decision: string | null;
  unit_director_control: string | null;
}

async function getDisciplineFromApiServer(disciplineId: string): Promise<Discipline | null> {
  const url = `${URL}discipline/${disciplineId}`;
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (JSON.parse(error.message).error === 'not_found') {
        return null;
      }
      throw error;
    }
    throw new Error('Произошла ошибка при получении данных с сервера');
  }
}

export async function responceArr(conversation: Conversation, ctx: Context) {
  const [prefix, disciplineId] = ctx.callbackQuery?.data!.split(':')!;

  const childLogger = logger.child({ prefix, disciplineId });

  const discipline = await conversation.external(() => getDisciplineFromApiServer(disciplineId));
  if (discipline === null) {
    return ctx.reply('Запись о нарушении дисциплины найдена. Пожалуйста, попробуйте позже.');
  }
  childLogger.info({ discipline }, 'Fetched discipline from server');
  const scheduledShiftStartAtLocal = parseISO(discipline.scheduled_shift_start_at_local);
  const formattedStartAtLocal = format(scheduledShiftStartAtLocal, 'dd.MM.yyyy HH:mm');
  let question = await ctx.reply(`Ответ по нарушению дисциплины за ${formattedStartAtLocal}`, {
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

  const requestData = {
    id: discipline.id,
    commentStaff: ctx1.msg.text,
  };
  try {
    await postDataServer('discipline', requestData);
    await ctx.reply(`Спасибо, Ваш ответ  <b>принят</b>`, {
      parse_mode: 'HTML',
      reply_parameters: { message_id: question.message_id, quote: question.text },
    });
  } catch (error: unknown) {
    await ctx.reply('Не удалось записать ответ на сервер. Пожалуйста, попробуйте позже.');
  }
}

export async function decision(conversation: Conversation, ctx: Context) {
  const [prefix, disciplineId] = await ctx.callbackQuery?.data!.split(':')!;
  const discipline = await conversation.external(() => getDisciplineFromApiServer(disciplineId));

  if (discipline === null) {
    return ctx.reply('Запись о нарушении дисциплины найдена. Пожалуйста, попробуйте позже.');
  }

  const scheduledShiftStartAtLocal = parseISO(discipline.scheduled_shift_start_at_local);
  const formattedStartAtLocal = format(scheduledShiftStartAtLocal, 'dd.MM.yyyy HH:mm');

  let question = await ctx.reply(`Ответ по нарушению дисциплины за ${formattedStartAtLocal}`, {
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

  const requestData = {
    id: discipline.id,
    managerDecision: ctx1.msg.text,
    unitDirectorControl: discipline.unit_director_control,
  };
  try {
    await postDataServer('discipline', requestData);
    await ctx.reply(`Спасибо, Ваш ответ  <b>принят</b>`, {
      parse_mode: 'HTML',
      reply_parameters: { message_id: question.message_id, quote: question.text },
    });
  } catch (error: unknown) {
    await ctx.reply('Не удалось записать ответ на сервер. Пожалуйста, попробуйте позже.');
  }
}
