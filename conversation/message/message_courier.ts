import { type Context, InlineKeyboard } from 'grammy';
import { type Conversation } from '@grammyjs/conversations';
import { getDataFromServer, postDataServer } from '../../services/api';
import { StaffData, UnitsSettings } from '../../type/type';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function message_courier(conversation: Conversation, ctx: Context) {
  const staffData: StaffData[] = await conversation.external(async () => await getDataFromServer('staffData'));

  const unitsSettings: UnitsSettings[] = await conversation.external(
    async () => await getDataFromServer('unitsSettings'),
  );

  function getNameFunctionAndUnitName() {
    let nameFunction: string | undefined;
    let unitName: string | undefined;
    unitsSettings.forEach((unit) => {
      if (unit.idTelegramm) {
        for (const el of unit.idTelegramm) {
          if (el.id === ctx.chatId) {
            // 1782943981  2048110941 ctx.chatId
            nameFunction = el.nameFunction;
            unitName = unit.unitName;
          }
        }
      }
    });
    return [nameFunction, unitName];
  }
  const [nameFunction, unitName] = await conversation.external(() => getNameFunctionAndUnitName());

  if (nameFunction === 'Управляющий' || nameFunction === 'Графист по курьерам' || nameFunction === 'Графист по кухне') {
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
        await postDataServer('allCourier', { content: messageToStaff.msg.text, chatId: ctx.chatId, unitName });
        return;
      }
      if (responce.callbackQuery.data === 'Кроме курьеров на смене') {
        await postDataServer('NotOnShiftCourier', { content: messageToStaff.msg.text, chatId: ctx.chatId, unitName });
        return;
      }
      if (responce.callbackQuery.data === 'Курьерам на смене') {
        await postDataServer('onShiftCourier', { content: messageToStaff.msg.text, chatId: ctx.chatId, unitName });
        return;
      }
      if (responce.callbackQuery.data === 'NotTodayShiftCourier') {
        await postDataServer('NotTodayShiftCourier', {
          content: messageToStaff.msg.text,
          chatId: ctx.chatId,
          unitName,
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