import { type Context, InlineKeyboard } from 'grammy';
import { type Conversation } from '@grammyjs/conversations';
import { getDataFromServer, postDataServer } from '../../services/api';
import { StaffData, UnitsSettings, Staff } from '../../type/type';

export async function message_courier(conversation: Conversation, ctx: Context) {
  let params = [ctx.chatId];
  let query = `
  select 
u."name" as "unitName",
t."name" as "nameFunction",
tg.department_id,
tg.unit_id as "unitId",
d.access_token
from public.telegram_id tg
join public.task_staff t on t.id = tg.task_staff_id
join units u on u.id = tg.unit_id
join public.departments d on u.department_id  = d.id
where telegram_id = $1
  `;
  const [{ unitName, nameFunction, department_id, unitId, access_token }] = await conversation.external(
    async () => await postDataServer('posgreSQL', { query, params }),
  );

  params = [department_id, unitName];
  query = `select 
  s.id,
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
		and "staffType" = 'Courier'
    and "unitName" = $2
    and status != 'Dismissed'
		and "idTelegramm" is not null`;
  const staffData: Staff[] = await conversation.external(
    async () => await postDataServer('posgreSQL', { query, params }),
  );

  if (
    nameFunction === 'Управляющий' ||
    nameFunction === 'Графист по курьерам' ||
    nameFunction === 'Графист по кухне' ||
    nameFunction === 'Франчайзи'
  ) {
    let change = await ctx.reply('Кому отправить сообщение?', {
      reply_markup: new InlineKeyboard()
        .text('Всем курьерам', 'Всем курьерам')
        .row()
        .text('Кроме курьеров на смене', 'Кроме курьеров на смене')
        .row()
        .text('Курьерам на смене', 'Курьерам на смене')
        .row()
        .text('Курьеры у которых сегодня нет смены', 'NotTodayShiftCourier')
        .row()
        .text('Отмена', 'Отмена'),
    });

    const responce = await conversation.waitForCallbackQuery(
      ['Всем курьерам', 'Кроме курьеров на смене', 'Курьерам на смене', 'NotTodayShiftCourier', 'Отмена'],
      {
        otherwise: async (ctx) => {
          await ctx.reply(`<b>Ошибка.</b> Выберете получателя или нажмите Отмена`, {
            reply_parameters: { message_id: change.message_id },
            parse_mode: 'HTML',
          });
        },
      },
    );

    if (responce.callbackQuery.data === 'Отмена') {
      await ctx.reply('Вы отменили отправку сообщения');
      return;
    }

    let callback = ['Всем курьерам', 'Кроме курьеров на смене', 'Курьерам на смене', 'NotTodayShiftCourier'];
    if (callback.includes(responce.callbackQuery.data)) {
      let question = await ctx.reply('Напишите текст сообщения', {
        reply_markup: { force_reply: true },
      });
      const messageToStaff = await conversation.waitForReplyTo(question.message_id, {
        otherwise: async (ctx) =>
          await ctx.reply('<b>Ошибка.</b>  напишите текст сообщения', {
            reply_parameters: { message_id: question.message_id },
            parse_mode: 'HTML',
          }),
      });
      if (responce.callbackQuery.data === 'Всем курьерам') {
        await postDataServer('allCourier', {
          content: messageToStaff.msg.text,
          chatId: ctx.chatId,
          unitName,
          staffData,
        });
        return;
      }
      if (responce.callbackQuery.data === 'Кроме курьеров на смене') {
        await postDataServer('NotOnShiftCourier', {
          content: messageToStaff.msg.text,
          chatId: ctx.chatId,
          unitId,
          access_token,
          staffData
        });
        return;
      }
      if (responce.callbackQuery.data === 'Курьерам на смене') {
        await postDataServer('onShiftCourier', {
          content: messageToStaff.msg.text,
          chatId: ctx.chatId,
          unitId,
          access_token,
          staffData
        });
        return;
      }
      if (responce.callbackQuery.data === 'NotTodayShiftCourier') {
        await postDataServer('NotTodayShiftCourier', {
          content: messageToStaff.msg.text,
          chatId: ctx.chatId,
          unitId,
          access_token,
          staffData
        });
        return;
      }
    }

    // Нет прав на рассылку
  } else {
    await ctx.reply('Отправлять сообщения курьерам может только управляющий');
    return;
  }
}