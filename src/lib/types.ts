export interface CreditCard {
  id: string;
  name: string;
  apr: number;
  creditLimit: number;
}

export interface MonthlyEntry {
  month: string; // "YYYY-MM"
  balances: Record<string, number>; // cardId -> balance
  extraPayment: number;
}

export interface Allocation {
  cardId: string;
  cardName: string;
  weight: number;
  weightPercent: number;
  amount: number;
  balance: number;
}
