import { CreditCard, Allocation } from "./types";

export function calculateAllocations(
  cards: CreditCard[],
  balances: Record<string, number>,
  extraPayment: number
): Allocation[] {
  if (extraPayment <= 0) return cards.map(c => ({
    cardId: c.id, cardName: c.name, weight: 0, weightPercent: 0, amount: 0, balance: balances[c.id] || 0,
  }));

  const cardsWithBalance = cards.filter((c) => (balances[c.id] || 0) > 0);

  const weights = cardsWithBalance.map((card) => ({
    card,
    weight: card.apr * (balances[card.id] || 0),
  }));

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

  const allocMap = new Map<string, Allocation>();

  // Cards with zero balance get zero allocation
  for (const card of cards) {
    const bal = balances[card.id] || 0;
    allocMap.set(card.id, {
      cardId: card.id,
      cardName: card.name,
      weight: 0,
      weightPercent: 0,
      amount: 0,
      balance: bal,
    });
  }

  if (totalWeight > 0) {
    for (const { card, weight } of weights) {
      const weightPercent = (weight / totalWeight) * 100;
      const amount = Math.round((weight / totalWeight) * extraPayment * 100) / 100;
      allocMap.set(card.id, {
        cardId: card.id,
        cardName: card.name,
        weight,
        weightPercent,
        amount,
        balance: balances[card.id] || 0,
      });
    }
  }

  return Array.from(allocMap.values());
}
