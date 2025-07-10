export type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  patronymicName: string;
  sex: string;
  phoneNumber: string;
  inn: string;
  unitId: string;
  unitName: string;
  positionName: string;
  status: string;
  hiredOn: string;
  dismissedOn: string;
  lastModifiedAt: string;
  dismissalComment: string;
  dismissalReason: string;
  commentHR: string;
  resolutionHR: string;
  resolutionManager: string;
  dateOfCall: string;
  result: string;
  countCall: number;
  violation: boolean;
  dateBack: string;
  furtherCall: string;
  contact: any[];
};

export type ContactStaff = {
  dateOfCall: string;
  resolutionManager: string;
  countCall: number;
  violation: boolean;
  message: boolean;
  result: string;
  cancelResolutionHR: boolean;
  idContact: string;
};

export type StaffFioAndUnitAndHiredOn = {
  fio: string;
  unitName: string;
  hiredOn: string;
};

export interface Members {
  staffId: string;
  fio: string;
  taxpayerIdentificationNumber: string;
  phoneNumber: string;
  unitName: string;
  positionName: string;
  staffType: string;
  status: string;
  hiredOn: string;
  dateOfBirth: string;
  deliveredOrdersCount: number;
  shiftsInfo: ShiftsInfo[];
  staffCertification: false;
  friendsPay: FriendsPay[];
  bonusYear: DataBonus[];
}

interface ShiftsInfo {
  shiftsId: string;
  dataOpenShifts: string;
  shiftsOrderCount: string | number;
}

interface FriendsPay {
  fioFriend: string;
  idFriend: string;
  firstPay: boolean;
  twoPay: boolean;
  threePay: boolean;
}

interface DataBonus {
  dataBonus: string;
  amount: string | number;
}

export interface TelegramID {
  name: string;
  unitName: string;
  id: number;
  unitId: string;
  idGroup: number;
  deliveryManagerName: string;
  deliveryManagerId: number;
  kitchenManagerName: string;
  kitchenManagerId: number;
  managerId: number;
}

export interface StaffData {
  id: string;
  lastName: string;
  firstName: string;
  patronymicName: string;
  inn: string;
  phoneNumber: string;
  unitName: string;
  positionName: string;
  staffType: string;
  hiredOn: string;
  dismissedOn: string;
  status: string;
  lastModifiedAt: string;
  idTelegramm: string | number;
}

export interface UnitsSettings {
  type: string;
  unitName: string;
  unitId: string;
  timeWork?: {
    delivery?: {
      workingTimeStart?: string;
      workingTimeStop?: string;
    };
    restoran?: {
      workingTimeStart?: string;
      workingTimeStop?: string;
    };
  };
  programs?: Programs[];
  idTelegramm: IdTelegramm [];
  extraTime?: string;
}

interface Programs {
  name: string;
  isActive: boolean;
}

interface IdTelegramm {
  id: number;
  nameFunction: string;
  fio: string;
}
