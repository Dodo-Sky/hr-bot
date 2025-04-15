import { type Context, InlineKeyboard } from 'grammy';
import { type Conversation } from '@grammyjs/conversations';
import { getDataFromServer } from '../../services/api';
import { StaffData, UnitsSettings } from '../../type/type';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function message_kitchen(conversation: Conversation, ctx: Context) {
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

  // сообщение от HR службы (все пиццерии)
  if (
    nameFunction === 'HR директор' ||
    nameFunction === 'HR менеджер' ||
    nameFunction === 'Руководитель отдела обучения и контроллинга'
  ) {
    const nameUnits = unitsSettings.map((el) => [el.unitName, el.unitName]);
    nameUnits.unshift(['Все', 'Все']);
    nameUnits.push(['Отмена', 'Отмена']);

    let buttonRow: any = nameUnits.map(([label, name]) => [InlineKeyboard.text(label, name)]);
    const keyboard = InlineKeyboard.from(buttonRow);
    let changeUnit = await ctx.reply('Кому отправить сообщение?', {
      reply_markup: keyboard,
    });

    let callback = nameUnits.map((el) => el[1]);
    const responce = await conversation.waitForCallbackQuery(callback, {
      otherwise: async (ctx) => {
        await ctx.reply(`ОШИБКА!! Выберетие пицерию для отправки сообщения или нажмите Отмена`, {
          reply_parameters: { message_id: changeUnit.message_id },
        });
      },
    });

    // Рассылка
    let listNotofication: StaffData[];
    let chatId: any;

    if (responce.callbackQuery.data === 'Все') {
      listNotofication = staffData.filter((el: StaffData) => el.idTelegramm && el.staffType !== 'Courier');
    } else if (responce.callbackQuery.data === 'Отмена') {
      await ctx.reply('Вы отменили отправку сообщения');
      return;
    } else {
      listNotofication = staffData.filter(
        (el: StaffData) => el.idTelegramm && el.staffType !== 'Courier' && el.unitName === responce.callbackQuery.data,
      );
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
        await ctx.reply(`ОШИБКА!! категорию или нажмите Отмена`, {
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

      for (const id of chatId) {
        try {
          await ctx.api.sendMessage(id, messageToStaff.msg.text!);
        } catch (err) {
          let staff = staffData.find((el) => el.idTelegramm === id);
          let fio = `${staff?.firstName} ${staff?.lastName}`;
          await ctx.reply(`Не удалось отправить сообщение ${fio}`);
          console.log(err + 'Ошибка в прогорамме отправка сообщений');
        } finally {
          await sleep(500);
        }
      }
      await ctx.reply(`Отправлено ${chatId.length} сотрудникам`);
    }

    // сообщение от управляющего (только своя пиццерия)
  } else if (nameFunction === 'Управляющий') {
    let queston = await ctx.reply('Напишите текст сообщения команде', {
      reply_markup: { force_reply: true },
    });

    const messageToStaff = await conversation.waitForReplyTo(queston.message_id, {
      otherwise: async (ctx) =>
        await ctx.reply('ОШИБКА! напишите текст сообщения команде', {
          reply_parameters: { message_id: queston.message_id },
        }),
    });

    let chatId = staffData
      .filter(
        (el: StaffData) =>
          el.idTelegramm && el.staffType !== 'Courier' && el.status === 'Active' && el.unitName === unitName,
      )
      .map((el) => el.idTelegramm);

    for (const id of chatId) {
      try {
        await ctx.api.sendMessage(id, messageToStaff.msg.text!);
      } catch (err) {
        let staff = staffData.find((el) => el.idTelegramm === id);
        let fio = `${staff?.firstName} ${staff?.lastName}`;
        await ctx.reply(`Не удалось отправить сообщение ${fio}`);
        console.log(err + 'Ошибка в прогорамме отправка сообщений');
      } finally {
        await sleep(500);
      }
    }
    await ctx.reply(`Отправлено ${chatId.length} сотрудникам`);
    return;

    // Прочеее
  } else {
    await ctx.reply('Отправлять сообщения команде может только управляющий или сотрудник HR службы');
    return;
  }
}