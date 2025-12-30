import { ID, Timestamp, Money, Attribute } from "./types";

export interface Contract {
  id: ID;
  playerId: ID;
  clubId: ID;
  startDate: Timestamp;
  endDate: Timestamp;
  monthlyWage: Money;
  releaseClause: Money;
  isLoaned: boolean;
  active: boolean;
}

export interface ClubManager {
  id: ID;
  clubId: ID;
  managerId: ID;
  monthlyWage: Money;
  releaseClause: Money;
  expirationDate: Timestamp;
  createdAt: Timestamp;
}

export interface StaffContract {
  id: ID;
  staffId: ID;
  clubId: ID;
  monthlyWage: Money;
  releaseClause: Money;
  active: boolean;
}

export interface TransferOffer {
  id: ID;
  playerId: ID;
  buyingClubId: ID;
  sellingClubId: ID;
  offerDate: Timestamp;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "NEGOTIATING";
  feeAmount: Money;
  wageOffer: Money;
  contractYears: number;
  type: string;
  rejectionReason: string | null;
}

export interface PlayerLoan {
  id: ID;
  contractId: ID;
  originClubId: ID;
  destinyClubId: ID;
  expirationDate: Timestamp;
  fee: Money;
  wagePercentagePaidByDestiny: Attribute;
}
