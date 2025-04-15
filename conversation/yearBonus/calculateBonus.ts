import { type Context, InlineKeyboard } from 'grammy';
import { type Conversation } from '@grammyjs/conversations';
import { getDataFromServer, getStaffFioAndUnit, postDataServer } from '../../services/api';
import { sheetsApi } from '../../services/google';
import { Members } from '../../type/type';
import { format } from 'date-fns';

const SPREADSHEET_ID = '1Ik1UU6APOIvhHY48YV-9p0gZbMsBv-9j-Paw8x1kRtk';

export async function calculateBonus(conversation: Conversation, ctx: Context) {
  const [, staffId, year] = await ctx.callbackQuery!.data!.split('+');
  const staffFioAndUnit = await getStaffFioAndUnit(staffId);

  if (!staffFioAndUnit) {
    await ctx.reply('Не удалось получить данные о сотруднике');
    return;
  }

  let { fio, unitName } = staffFioAndUnit;

  let question = await ctx.reply('В ответном сообщении напишите размер бонуса', {
    reply_markup: { force_reply: true },
  });

  const amountPay = await conversation.waitForReplyTo(question.message_id, {
    otherwise: async (ctx) =>
      await ctx.reply('ОШИБКА! напишите сумму премии', {
        reply_parameters: { message_id: question.message_id },
      }),
  });

  await ctx.reply('Ожидайте отчета о загрузке. Если отчета не будет попробуйте позднее');
  let dataFromGoogleSheet = await sheetsApi.spreadsheets.values.get({
    range: 'Годовой бонус!A2:L',
    spreadsheetId: SPREADSHEET_ID,
  });

  let members: Members[] = await getDataFromServer('members');
  let dataSheet = dataFromGoogleSheet.data.values!;

  const range = dataSheet.findIndex((el) => staffId + year === el[1] + el[6]?.split('.')[2]) + 2;

  let amount;
  let dataMeet;

  function extractYearFromDDMMYYYYDate({ dataBonus }: { dataBonus: string }): string | undefined {
    if (!dataBonus) return;
    const [, , year] = dataBonus.split('.');
    return year;
  }

  function getYearsOfMember(member: Members) {
    const memberBonusYears = member.bonusYear ?? [];
    return memberBonusYears.map(extractYearFromDDMMYYYYDate);
  }

  const currentDate = format(new Date(), 'dd.MM.yyyy');
  const currentYear = format(new Date(), 'yyyy');
  
  function safeParseNumber(value: string | undefined): number | undefined {
    const parsed = Number(value!.replace(',', '.'));
    return isNaN(parsed) ? undefined : parsed;
  }

  // по умолчанию запись с телеги
  try {
    amount = safeParseNumber(amountPay.message!.text);
    if (!amount) return;
    for (const staff of members) {
      if (staff.staffId !== staffId) continue;
      console.log(staff);
      const arrDataBonus = getYearsOfMember(staff);

      console.log(['arrDataBonus', arrDataBonus]);

      if (arrDataBonus.includes(currentYear)) {
        for (let bonus of staff.bonusYear) {
          if (extractYearFromDDMMYYYYDate(bonus) === currentYear) {
            bonus.dataBonus = currentDate;
            bonus.amount = amount;
            dataMeet = dataSheet.find((el) => el[1] === staffId);
          }
          break;
        }
      } else {
        staff.bonusYear.push({
          dataBonus: currentDate,
          amount,
        });
        dataMeet = dataSheet.find((el) => el[1] === staff);
      }
    }

    await sheetsApi.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Годовой бонус!J${range}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[amount]],
      },
    });

    await ctx.reply(`Отчет.
    Сохранена в системе премия в размере ${amount} рублей в пользу ${fio}`);

    // Запись вручную
  } catch {
    for (const staff of members) {
      for (const elem of dataSheet) {
        if (staff.staffId != elem[1]) continue;
        let arrDataBonus = staff.bonusYear?.map((el: any) => el?.dataBonus.split('.')[2]);
        if (arrDataBonus.includes(currentYear)) {
          for (let bonus of staff.bonusYear) {
            if (bonus?.dataBonus.split('.')[2] === currentYear) {
              if (elem[9] != bonus.amount) {
                bonus.dataBonus = currentDate;
                amount = elem[9];
                bonus.amount = amount;
                dataMeet = elem[10];
                fio = elem[0];
                unitName = elem[3];
                break;
              }
            }
          }
        } else {
          for (const staff of members) {
            amount = elem[9];
            staff.bonusYear.push({
              dataBonus: currentDate,
              amount,
            });
            dataMeet = elem[10];
            fio = elem[0];
            unitName = elem[3];
            break;
          }
        }
      }
    }
  }

  const unitsSettings = await getDataFromServer('unitsSettings');
  let directorUnitChatId = +unitsSettings
    .find((el: any) => el.unitName === unitName)
    .idTelegramm.find((el: any) => el.nameFunction === 'Управляющий').id;
  //   directorUnitChatId = 1185183311;

  const text = `
Сотрудник - ${fio} имеет право на получение годового бонуса.
Для получения бонуса вам необходимо назначить сотруднику встречу.
Место встречи - офис Додо Пицца Тюмень.
Время - 12:00`;

  await ctx.api.sendMessage(directorUnitChatId, text, {
    parse_mode: 'Markdown',
  });
}