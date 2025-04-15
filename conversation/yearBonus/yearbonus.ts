import { type Context, InlineKeyboard } from 'grammy';
import { type Conversation } from '@grammyjs/conversations';
import { getDataFromServer, getStaffFioAndUnit, postDataServer } from '../../services/api';
import { sheetsApi } from '../../services/google';
import { parse, isValid, format, addWeeks, setDay, subDays } from 'date-fns';


const SPREADSHEET_ID = '1Ik1UU6APOIvhHY48YV-9p0gZbMsBv-9j-Paw8x1kRtk';

export async function cancelYearBonus(conversation: Conversation, ctx: Context) {
  const [, staffId, year] = await ctx.callbackQuery!.data!.split('+');
  const staffFioAndUnit = await getStaffFioAndUnit(staffId);

  if (!staffFioAndUnit) {
    await ctx.reply('Не удалось получить данные о сотруднике');
    return;
  }

  const { fio, unitName } = staffFioAndUnit;
  let question = await ctx.reply(`Напишите причину отказа в выплате премии в пользу  ${fio} из ${unitName}`, {
    reply_markup: {
      force_reply: true,
      input_field_placeholder: 'ответ',
    },
  });

  const ctx1 = await conversation
    .waitForReplyTo(question.message_id, {
      otherwise: (ctx) =>
        ctx.reply('ОШИБКА! Ответьте на этот вопрос для продолжения работы', {
          reply_parameters: { message_id: question.message_id },
        }),
    })
    .andFor(':text', { otherwise: (ctx) => ctx.reply('Ответ принимается только текстом') });

  const dataFromGoogleSheet = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Годовой бонус!A2:L',
  });

  const result = ctx1.message!.text;

  const dataSheet = dataFromGoogleSheet.data.values!;
  for (let i = 0; i < dataSheet.length; i++) {
    if (staffId + year === dataSheet[i][1] + dataSheet[i][6]?.split('.')[2] && !dataSheet[i][9]) {
      const range = `Годовой бонус!H${i + 2}`;
      const values = [[result, '', '', '', '']];
      await sheetsApi.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range,
        valueInputOption: 'RAW',
        requestBody: {
          values,
        },
      });
    }
  }

  await ctx1.reply(`
    Отчет.
Решение ${result} внесено в базу в отношении ${fio} . Спасибо за работу`);
}

function getAmountBonus(hiredOn: string): string | null {
  let year = Number(hiredOn.split('.').at(-1));
  let amountBonus = null;
  let nowYear = subDays(new Date(), 27).getFullYear();
  if (nowYear - year >= 1 && nowYear - year < 2) {
    amountBonus = '50%';
  }
  if (nowYear - year >= 2 && nowYear - year < 3) {
    amountBonus = '75%';
  }
  if (nowYear - year >= 3) amountBonus = '100%';
  if (nowYear - year < 1) return null;
  return amountBonus;
}

export async function okYearBonus(conversation: Conversation, ctx: Context) {
  const [, staffId, year] = await ctx.callbackQuery!.data!.split('+');

  const staffFioAndUnit = await getStaffFioAndUnit(staffId);

  if (!staffFioAndUnit) {
    await ctx.reply('Не удалось получить данные о сотруднике');
    return;
  }

  let { fio, unitName, hiredOn } = staffFioAndUnit;

  await ctx.reply(
    `Совместно с управляющим вы приняли решение что *${fio}* из ${unitName} *имеет право* на премию. Ожидайте записи в систему`,
    {
      parse_mode: 'Markdown',
    },
  );

  let dataFromGoogleSheet = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Годовой бонус!A2:L',
  });
  let dataControl;

  let dataSheet = dataFromGoogleSheet.data.values!;
  for (let i = 0; i < dataSheet.length; i++) {
    const rawDate = dataSheet[i][6];
    const [day, month] = rawDate?.split('.') || [];

    const parsedDate = parse(rawDate, 'dd.MM.yyyy', new Date());
    if (!isValid(parsedDate)) continue;

    const currentYear = new Date().getFullYear();
    const baseDate = new Date(`${currentYear}-${month}-${day}`);
    const targetDate = setDay(addWeeks(baseDate, 1), 2, { weekStartsOn: 1 });
    const dataControl = format(targetDate, 'dd.MM.yyyy');

    if (staffId + year === dataSheet[i][1] + dataSheet[i][6]?.split('.')[2] && !dataSheet[i][9]) {
      await sheetsApi.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Годовой бонус!H${i + 2}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['Согласовано', getAmountBonus(dataSheet[i][5]), '', dataControl, 'Ожидание']],
        },
      });
      break;
    }
  }
  await ctx.reply(
    `Отчет.
  Решение Согласовано внесено в базу в отношении ${fio} . Спасибо за работу`,
  );

  const unitsSettings = await getDataFromServer('unitsSettings');
  let accountantChatId = +unitsSettings
    .find((el: any) => el.unitName === 'Офис')
    .idTelegramm.find((el: any) => el.nameFunction === 'Бухгалтер по зарплате').id;

  // accountantChatId = 1185183311;

  let pay = await ctx.api.sendMessage(
    accountantChatId,
    `Необходимо сделать расчет годового бонуса
получатель - ${fio}
пиццерия - ${unitName}
размер бонуса - ${getAmountBonus(hiredOn)} от среднемесячной зарплаты
срок расчета - 1 рабочий день`,
    {
      reply_markup: new InlineKeyboard().text('Рассчитайте сумму', `calculateBonus+${staffId}+${year}`),
    },
  );
}

export async function publishedYearBonus(conversation: Conversation, ctx: Context) {
  const [, staffId, year] = await ctx.callbackQuery!.data!.split('+');

  const staffFioAndUnit = await getStaffFioAndUnit(staffId);

  if (!staffFioAndUnit) {
    await ctx.reply('Не удалось получить данные о сотруднике');
    return;
  }

  let { fio, unitName, hiredOn } = staffFioAndUnit;

  await ctx.reply(`Вы оппубликовали сообщение о премировании ${fio} из ${unitName}. Ожидайте записи в систему`);

  const dataFromGoogleSheet = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Годовой бонус!A2:L',
  });

  const dataSheet = dataFromGoogleSheet.data.values!;

  let idAndYear = `${staffId}+${year}`;

  for (let i = 0; i < dataSheet.length; i++) {
    if (`${dataSheet[i][1]}+${dataSheet[i][6]?.split('.')[2]}` === idAndYear) {
      await sheetsApi.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Годовой бонус!L${i + 2}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['Опубликовано']],
        },
      });
      break;
    }
  }

  await ctx.reply(
    `Отчет.
Данные о публикации выплаты годового бонуса в пользу ${fio} внесены в систему. Спасибо за работу`,
  );
}
