import { type Context, InlineKeyboard, NextFunction } from 'grammy';
import { type Conversation } from '@grammyjs/conversations';
import { getDataFromServer, postDataServer } from '../../services/api';
import { Staff, ContactStaff } from '../../type/type';
import { parse, isValid } from 'date-fns';

async function getStaffAndContact(idContact: string): Promise<any> {
  const dismissed = await getDataFromServer('dismissed');
  const staff: Staff = dismissed.find((el: { contact: [] }) =>
    el.contact?.find((elem: ContactStaff) => elem.idContact === idContact),
  );
  const contactStaff: ContactStaff = staff.contact.find((el) => el.idContact === idContact);
  return [staff, contactStaff];
}

export async function instructions(conversation: Conversation, ctx: Context) {
  const [, idContact] = await ctx.callbackQuery?.data!.split('+')!;

  // загрузка переменных с сервера
  const [staff, contactStaff] = await conversation.external(() => getStaffAndContact(idContact));

  // первый вопрос управляющему о необходимости связаться с уволенным работником
  await ctx.reply(
    `Вы будете связываться с ${staff.lastName} ${staff.firstName} ${staff.patronymicName}?
         
Телефон для связи
${staff.phoneNumber}`,
    {
      reply_markup: new InlineKeyboard()
        .text('Приглашаем', 'Приглашаем')
        .row()
        .text('Не приглашаем', 'Не приглашаем')
        .row()
        .text('В резерв (пока штат укомплектован)', 'В резерв (пока штат укомплектован)'),
    },
  );

  const survey = await conversation.waitForCallbackQuery(
    ['Приглашаем', 'Не приглашаем', 'В резерв (пока штат укомплектован)'],
    {
      otherwise: async (ctx) => {
        await ctx.reply(`ОШИБКА!!! Выберете свой ответ по ${staff.lastName} ${staff.firstName}`);
      },
    },
  );

  // Управляющий принял решение что нужно возвращать сотрудника
  if (survey.callbackQuery.data === 'Приглашаем') {
    await survey.answerCallbackQuery(survey.callbackQuery.data);

    // однократно записываем решение управляющего о возврате
    await conversation.external(() => {
      contactStaff.resolutionManager = 'Да';
      postDataServer('dismissed', contactStaff);
    });
    if (staff.positionName === 'Авто, личное ТС' || staff.positionName === 'Автомобильный') {
      await ctx.reply(
        `
${staff.firstName}, добрый день! 👋

Это управляющий Додо пиццы. Ранее, Вы отлично показали себя в Додо и мы были бы рады видеть Вас снова! 🚀

Мы подготовили для Вас новые условия, которые точно Вас удивят! 🤩

💵 Подняли ставку за км, чтобы Вы могли не переживать за расходы на ГСМ!
💰 Внедрили динамическую оплату в определенный период времени, которая позволит Вам получать дополнительную выплату за свою услугу! Это значит, что Ваш доход может быть еще выше!
✨ Расширили реферальную программу, теперь Вы можете получить не только локальный бонус, но федеральный!

Интересно? 🤔 Предлагаю обсудить детальнее, чтобы Вы могли понять все преимущества сотрудничества с нами. 💬

Что думаете? Готовы вернуться к нам и начать получать еще больше? 💸

Буду ждать от Вас ответа! 📲`,
      );
    } else {
      await ctx.reply(`
${staff.firstName}, добрый день/вечер! 👋

Это управляющий Додо пиццы. Мы помним Вас как одного из наших лучших сотрудников, и мы были бы рады видеть Вас снова в нашей команде!

📢 Вы знаете, что за период вашего отсутствия в Додо произошли большие изменения!
💵 подняли ставку за час, чтобы Вы могли зарабатывать еще больше.
📖 упростили систему стажировки, чтобы Вы могли быстрее влиться в работу.
💰 внедрили годовой бонус, который позволит Вам получить дополнительную выплату за свою работу.
✨ расширили реферальную программу, теперь Вы можете получить бонус не только от нашей компании, но и от управляющей компании!

Если Вам интересно услышать подробнее о каком-либо нововведении, мы можем продолжить разговор. Я готов(а) ответить на все Ваши вопросы и рассказать о всех преимуществах работы в нашей команде.

Что думаете?
Готовы вернуться к нам и продолжить нашу совместную работу?

Мы ждем Вас!`);
    }

    // ответ сотрудника о приглашении
    await ctx.reply(`Какой ответ вы получили от  ${staff.lastName} ${staff.firstName}?`, {
      reply_markup: new InlineKeyboard().text('Вернется', 'Вернется').row().text('Отказ', 'Отказ'),
    });
    const replyStaff = await conversation.waitForCallbackQuery(['Вернется', 'Отказ'], {
      otherwise: async (ctx) =>
        await ctx.reply(
          `ОШИБКА!!! укажите какую информацию вы получили от сотрудника ${staff.lastName} ${staff.firstName}`,
        ),
    });

    // возврат
    if (replyStaff.callbackQuery.data === 'Вернется') {
      await replyStaff.answerCallbackQuery(replyStaff.callbackQuery.data);
      let question = await ctx.reply('Отлично, теперь укажите дату возвращения в формате YYYY-MM-DD (2019-11-30)', {
        reply_markup: { force_reply: true },
      });

      const dateComback = await conversation
        .waitForReplyTo(question.message_id, {
          otherwise: async (ctx) =>
            await ctx.reply('ОШИБКА! укажите дату возврата', {
              reply_parameters: { message_id: question.message_id },
            }),
        })
        .and((ctx) => isValid(parse(ctx.msg?.text || '', 'yyyy-MM-dd', new Date())), {
          otherwise: async (ctx) => await ctx.reply('Дата введена в неверном формате'),
        });
      await conversation.external(() => {
        const parsed = parse(dateComback.msg.text, 'yyyy-MM-dd', new Date());
        const formatted = format(parsed, 'yyyy-MM-dd');
        staff.dateBack = formatted;
        postDataServer('dismissedBot', staff);
        contactStaff.result = `Успешный звонок - планирует возвращение ${formatted}`;
        postDataServer('dismissed', contactStaff);
      });

      await ctx.reply(`Спасибо, Ваш ответ  <b>принят</b>`, {
        parse_mode: 'HTML',
      });
    }

    // отказ вернутся
    if (replyStaff.callbackQuery.data === 'Отказ') {
      await replyStaff.answerCallbackQuery(replyStaff.callbackQuery.data);
      let question = await ctx.reply(`Почему ${staff.lastName} ${staff.firstName} отказался возвращаться`, {
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

      await conversation.external(() => {
        contactStaff.result = ctx1.msg.text;
        postDataServer('dismissed', contactStaff);
      });

      await ctx.reply(
        `Спасибо, Ваш ответ  <b>принят</b>.
  Скажите стоит ли через 4 месяца снова попробовать вернуть данного сотрудника?`,
        {
          parse_mode: 'HTML',
          reply_parameters: { message_id: question.message_id, quote: question.text },
          reply_markup: new InlineKeyboard()
            .text('Да работаем над возвратом', 'Да работаем над возвратом')
            .row()
            .text('В дальнейшем не звоним', 'В дальнейшем не звоним'),
        },
      );

      const reply = await conversation.waitForCallbackQuery(['Да работаем над возвратом', 'В дальнейшем не звоним'], {
        otherwise: async (ctx) => await ctx.reply(`ОШИБКА!!! примите решение по ${staff.lastName} ${staff.firstName}`),
      });
      if (reply.callbackQuery.data === 'Да работаем над возвратом') {
        await conversation.external(() => {
          staff.furtherCall = 'Да';
          postDataServer('dismissedBot', staff);
        });
        await ctx.reply(
          `Спасибо, Ваш ответ  <b>принят</b>. Через 4 месяца я снова создам задачу на обзвон ${staff.lastName} ${staff.firstName}`,
          {
            parse_mode: 'HTML',
          },
        );
      }
      if (reply.callbackQuery.data === 'В дальнейшем не звоним') {
        await conversation.external(() => {
          staff.furtherCall = 'Нет';
          postDataServer('dismissedBot', staff);
        });
        await ctx.reply(
          `Спасибо, Ваш ответ  <b>принят</b>. Больше не будем звонить ${staff.lastName} ${staff.firstName}`,
          {
            parse_mode: 'HTML',
          },
        );
      }
    }
  }

  // отказываемся звонить
  if (survey.callbackQuery.data === 'Не приглашаем') {
    await survey.answerCallbackQuery(survey.callbackQuery.data);
    let question = await ctx.reply(
      `В ответе напишите причину отказа связываться с ${staff.lastName} ${staff.firstName}`,
      {
        reply_markup: { force_reply: true },
      },
    );
    const ctx1 = await conversation.waitForReplyTo(question.message_id, {
      otherwise: (ctx) =>
        ctx.reply('ОШИБКА!!! Ответьте на этот вопрос для продолжения работы', {
          reply_parameters: { message_id: question.message_id },
        }),
    });

    await conversation.external(() => {
      contactStaff.result = ctx1.msg.text;
      postDataServer('dismissed', contactStaff);
    });
    await ctx.reply(`Спасибо, Ваш ответ  <b>принят</b>`, {
      parse_mode: 'HTML',
    });
  }

  // резерв
  if (survey.callbackQuery.data === 'В резерв (пока штат укомплектован)') {
    await survey.answerCallbackQuery(survey.callbackQuery.data);
    await conversation.external(() => {
      contactStaff.result = 'В резерв (пока штат укомплектован)';
      postDataServer('dismissed', contactStaff);
    });
    await ctx.reply(`Спасибо, Ваш ответ  <b>принят</b>. Когда будет потребность приглашайте этого сотрудника`, {
      parse_mode: 'HTML',
    });
  }
}