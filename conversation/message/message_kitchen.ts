import { type Context, InlineKeyboard } from 'grammy';
import { type Conversation } from '@grammyjs/conversations';
import { postDataServer } from '../../services/api';
import { Staff } from '../../type/type';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function message_kitchen(conversation: Conversation, ctx: Context) {
  let params = [ctx.chatId];
  let query = `
  select 
u."name" as "unitName",
t."name" as "nameFunction",
tg.department_id
from public.telegram_id tg
join public.task_staff t on t.id = tg.task_staff_id
join units u on u.id = tg.unit_id
where telegram_id = $1
  `;
  const [{ unitName, nameFunction, department_id }] = await conversation.external(
    async () => await postDataServer('posgreSQL', { query, params }),
  );

  params = [department_id];
  query = `select 
  "firstName",
  "lastName",
  "unitName",
  status,
  "idTelegramm"
	from public.staff s
	join public.units u on u.id = s."unitId"
	join public.departments d on d.id = u.department_id
	where 1=1 
		and department_id = $1
		and "staffType" != 'Courier'
		and "idTelegramm" is not null`;
  const staffData: Staff[] = await conversation.external(
    async () => await postDataServer('posgreSQL', { query, params }),
  );
  const nameFunction_ok = [
    'HR директор',
    'HR менеджер',
    'Руководитель отдела обучения и контроллинга',
    'Франчайзи',
    'Территориальный управляющий',
  ];

  let listNotofication: Staff[];
  let chatId: string[];
  const message_ok: string[] = [];
  const message_err: string[] = [];

  if (nameFunction_ok.includes(nameFunction)) {
    const nameUnits = Array.from(new Set(staffData.map((el) => el.unitName)));
    nameUnits.unshift('Все');
    nameUnits.push('Отмена');

    let buttonRow: any = nameUnits.map((el) => [InlineKeyboard.text(el, el)]);
    const keyboard = InlineKeyboard.from(buttonRow);
    let changeUnit = await ctx.reply('Кому отправить сообщение?', {
      reply_markup: keyboard,
    });

    let callback = nameUnits.map((el) => el);
    const responce = await conversation.waitForCallbackQuery(callback, {
      otherwise: async (ctx) => {
        await ctx.reply(`ОШИБКА!! Выберетие пицерию для отправки сообщения или нажмите Отмена`, {
          reply_parameters: { message_id: changeUnit.message_id },
        });
      },
    });

    if (responce.callbackQuery.data === 'Все') {
      listNotofication = staffData;
    } else if (responce.callbackQuery.data === 'Отмена') {
      await ctx.reply('Вы отменили отправку сообщения');
      return;
    } else {
      listNotofication = staffData.filter((el: Staff) => el.unitName === responce.callbackQuery.data);
    }

    let question = await ctx.reply('Выберите категорию сотрудников', {
      reply_markup: new InlineKeyboard()
        .text('Активные', 'Active')
        .row()
        .text('Отстраненные', 'Suspended')
        .row()
        .text('Уволенные', 'Dismissed')
        .row()
        .text('Отмена', 'Отмена'),
    });

    const statusStaff = await conversation.waitForCallbackQuery(['Active', 'Suspended', 'Dismissed', 'Отмена'], {
      otherwise: async (ctx) => {
        await ctx.reply(`ОШИБКА!! Выберите категорию или нажмите Отмена`, {
          reply_parameters: { message_id: question.message_id },
        });
      },
    });

    if (statusStaff.callbackQuery.data === 'Отмена') {
      await ctx.reply('Вы отменили отправку сообщения');
      return;
    }

    let status = ['Active', 'Suspended', 'Dismissed'];
    if (status.includes(statusStaff.callbackQuery.data)) {
      chatId = listNotofication
        .filter((el) => el.status === statusStaff.callbackQuery.data)
        .map((el) => el.idTelegramm);
      let question1 = await ctx.reply('Напишите текст сообщения команде', {
        reply_markup: { force_reply: true },
      });
      const messageToStaff = await conversation.waitForReplyTo(question1.message_id, {
        otherwise: async (ctx) =>
          await ctx.reply('ОШИБКА! напишите текст сообщения', {
            reply_parameters: { message_id: question1.message_id },
          }),
      });

      //chatId = ['1185183311'];

      //Рассылка
      await ctx.reply(`Делаю рассылку, ждите отчета`);

      for (const id of chatId) {
        try {
          await ctx.api.sendMessage(id, `сообщение от ${nameFunction} \n ${messageToStaff.msg.text!}`);
          const staff = staffData.find((el) => el.idTelegramm == id);
          message_ok.push(`${staff?.lastName} ${staff?.firstName}`);
        } catch (err) {
          const staff = staffData.find((el) => el.idTelegramm === id);
          message_err.push(`${staff?.lastName} ${staff?.firstName}`);
          console.log(err + 'Ошибка в программе отправка сообщений');
        } finally {
          await sleep(500);
        }
      }

      if (message_ok.length === 0) {
        await ctx.reply(`Никому не отправлено сообщение`);
      } else {
        await ctx.reply(
          `Отправлено сообщение следующим сотрудникам 
  ${message_ok
    .sort((a, b) => a.localeCompare(b))
    .map((el, i) => `${i + 1}. ${el}`)
    .join('\n')}`,
        );
      }

      if (message_err.length === 0) {
        await ctx.reply(`Нет ошибок в отправке`);
      } else {
        await ctx.reply(
          `ОШИБКА в отправке сообщения
  ${message_err
    .sort((a, b) => a.localeCompare(b))
    .map((el, i) => `${i + 1}. ${el}`)
    .join('\n')}`,
        );
      }
    }
    return;

    // сообщение от управляющего (только своя пиццерия)
  } else if (nameFunction === 'Управляющий') {
    let queston = await ctx.reply('Напишите текст сообщения команде', {
      reply_markup: { force_reply: true },
    });

    const messageToStaff = await conversation.waitForReplyTo(queston.message_id, {
      otherwise: async (ctx) =>
        await ctx.reply('ОШИБКА! напишите текст сообщения команде кухни', {
          reply_parameters: { message_id: queston.message_id },
        }),
    });

    chatId = staffData
      .filter((el: Staff) => el.status !== 'Dismissed' && el.unitName === unitName)
      .map((el) => el.idTelegramm);

    //Рассылка
    await ctx.reply(`Делаю рассылку, ждите отчета`);

    for (const id of chatId) {
      try {
        await ctx.api.sendMessage(id, `сообщение от ${nameFunction} \n ${messageToStaff.msg.text!}`);
        const staff = staffData.find((el) => el.idTelegramm == id);
        message_ok.push(`${staff?.lastName} ${staff?.firstName}`);
      } catch (err) {
        const staff = staffData.find((el) => el.idTelegramm === id);
        message_err.push(`${staff?.lastName} ${staff?.firstName}`);
        console.log(err + 'Ошибка в программе отправка сообщений');
      } finally {
        await sleep(500);
      }
    }
    if (message_ok.length === 0) {
      await ctx.reply(`Никому не отправлено сообщение`);
    } else {
      await ctx.reply(
        `Отправлено сообщение следующим сотрудникам 
${message_ok
  .sort((a, b) => a.localeCompare(b))
  .map((el, i) => `${i + 1}. ${el}`)
  .join('\n')}`,
      );
    }

    if (message_err.length === 0) {
      await ctx.reply(`Нет ошибок в отправке`);
    } else {
      await ctx.reply(
        `ОШИБКА в отправке сообщения
${message_err
  .sort((a, b) => a.localeCompare(b))
  .map((el, i) => `${i + 1}. ${el}`)
  .join('\n')}`,
      );
    }
    return;

    // Прочее
  } else {
    await ctx.reply('Отправлять сообщения команде может только управляющий или сотрудник HR службы');
    return;
  }
}
