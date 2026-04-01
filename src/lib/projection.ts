import { CreditCard, MonthlyEntry } from "./types";
import { calculateAllocations } from "./allocator";
import { format, parse, addMonths } from "date-fns";

export interface ProjectionRow {
  month: string; // "MMM yy"
  balances: Record<string, number>; // cardId -> projected balance
  total: number;
}

/**
 * Estimate monthly net payment per card using all historical data.
 * Uses exponentially weighted analysis of implied payments (balance change + interest).
 * Also computes a trend slope so we can extrapolate improving/worsening payments.
 */
function estimatePaymentProfile(
  cards: CreditCard[],
  entries: MonthlyEntry[]
): {
  basePayments: Record<string, number>;
  paymentTrends: Record<string, number>; // monthly change in payment amount
} {
  const sorted = [...entries].sort((a, b) => a.month.localeCompare(b.month));
  const basePayments: Record<string, number> = {};
  const paymentTrends: Record<string, number> = {};

  cards.forEach((card) => {
    const monthlyRate = card.apr / 100 / 12;
    const dataPoints: { index: number; payment: number }[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const prevBal = sorted[i - 1].balances[card.id] || 0;
      const currBal = sorted[i].balances[card.id] || 0;

      if (prevBal <= 0 && currBal <= 0) continue;

      const interest = prevBal * monthlyRate;
      const impliedPayment = prevBal + interest - currBal;

      dataPoints.push({ index: i - 1, payment: impliedPayment });
    }

    if (dataPoints.length === 0) {
      basePayments[card.id] = 0;
      paymentTrends[card.id] = 0;
      return;
    }

    // Exponential weighting – recent data matters more
    const alpha = 0.3; // smoothing factor
    let ewma = dataPoints[0].payment;
    for (let i = 1; i < dataPoints.length; i++) {
      ewma = alpha * dataPoints[i].payment + (1 - alpha) * ewma;
    }

    // Compute trend via weighted linear regression on payment amounts
    let trend = 0;
    if (dataPoints.length >= 3) {
      const n = dataPoints.length;
      // Use last min(n, 6) points for trend to avoid ancient data skewing
      const recent = dataPoints.slice(-Math.min(n, 6));
      const weights = recent.map((_, i) => Math.pow(1.5, i));
      const totalW = weights.reduce((s, w) => s + w, 0);
      const meanX = weights.reduce((s, w, i) => s + w * i, 0) / totalW;
      const meanY = weights.reduce((s, w, i) => s + w * recent[i].payment, 0) / totalW;

      let num = 0, den = 0;
      for (let i = 0; i < recent.length; i++) {
        num += weights[i] * (i - meanX) * (recent[i].payment - meanY);
        den += weights[i] * (i - meanX) * (i - meanX);
      }
      trend = den > 0 ? num / den : 0;

      // Clamp trend to avoid wild extrapolation
      // Max trend: ±20% of current EWMA per month
      const maxTrend = Math.abs(ewma) * 0.2;
      trend = Math.max(-maxTrend, Math.min(maxTrend, trend));
    }

    basePayments[card.id] = ewma;
    paymentTrends[card.id] = trend;
  });

  return { basePayments, paymentTrends };
}

/**
 * Estimate future extra payment using trend from historical entries.
 * Uses EWMA of extra payments with a mild upward/downward trend.
 */
function estimateExtraPayment(entries: MonthlyEntry[]): {
  base: number;
  trend: number;
} {
  const sorted = [...entries].sort((a, b) => a.month.localeCompare(b.month));
  const payments = sorted.map((e) => e.extraPayment);

  if (payments.length === 0) return { base: 0, trend: 0 };
  if (payments.length === 1) return { base: payments[0], trend: 0 };

  // EWMA
  const alpha = 0.4;
  let ewma = payments[0];
  for (let i = 1; i < payments.length; i++) {
    ewma = alpha * payments[i] + (1 - alpha) * ewma;
  }

  // Trend from recent points
  const recent = payments.slice(-Math.min(payments.length, 6));
  let trend = 0;
  if (recent.length >= 2) {
    const weights = recent.map((_, i) => Math.pow(1.3, i));
    const totalW = weights.reduce((s, w) => s + w, 0);
    const meanX = weights.reduce((s, w, i) => s + w * i, 0) / totalW;
    const meanY = weights.reduce((s, w, i) => s + w * recent[i], 0) / totalW;

    let num = 0, den = 0;
    for (let i = 0; i < recent.length; i++) {
      num += weights[i] * (i - meanX) * (recent[i] - meanY);
      den += weights[i] * (i - meanX) * (i - meanX);
    }
    trend = den > 0 ? num / den : 0;

    // Clamp: max ±10% of base per month
    const maxTrend = Math.abs(ewma) * 0.1;
    trend = Math.max(-maxTrend, Math.min(maxTrend, trend));
  }

  return { base: Math.max(0, ewma), trend };
}

/**
 * Project balances forward month-by-month until all debts reach zero
 * or we hit a maximum horizon.
 *
 * Improvements over naive approach:
 *   - EWMA-based base payment estimates (adapts to recent behaviour)
 *   - Payment trend extrapolation (captures improving/worsening habits)
 *   - Extra payment trend analysis (not just last month's value)
 *   - Per-card trend awareness with clamping to prevent wild extrapolation
 *   - Graceful degradation with 0-1 months of data
 */
export function projectToZero(
  cards: CreditCard[],
  entries: MonthlyEntry[],
  maxMonths = 120
): ProjectionRow[] {
  if (cards.length === 0 || entries.length === 0) return [];

  const sorted = [...entries].sort((a, b) => a.month.localeCompare(b.month));

  // Find the last entry with actual balance data (skip months with empty balances)
  const entriesWithBalances = sorted.filter((e) => {
    const vals = Object.values(e.balances);
    return vals.length > 0 && vals.some((v) => v > 0);
  });
  const lastEntry = entriesWithBalances.length > 0
    ? entriesWithBalances[entriesWithBalances.length - 1]
    : sorted[sorted.length - 1];

  // Current balances
  const balances: Record<string, number> = {};
  let anyPositive = false;
  cards.forEach((card) => {
    balances[card.id] = lastEntry.balances[card.id] || 0;
    if (balances[card.id] > 0) anyPositive = true;
  });

  if (!anyPositive) return [];

  // Use only entries with actual balance data for estimation
  const validEntries = entriesWithBalances.length >= 2 ? entriesWithBalances : sorted;

  // Payment profiles from all history
  const { basePayments, paymentTrends } =
    validEntries.length >= 2
      ? estimatePaymentProfile(cards, validEntries)
      : { basePayments: {} as Record<string, number>, paymentTrends: {} as Record<string, number> };

  // Extra payment estimate from all history (use all entries since extra payment is independent)
  const extraEst = estimateExtraPayment(sorted);

  // Feasibility check: total reduction must exceed interest
  const totalInterest = cards.reduce(
    (s, c) => s + (balances[c.id] || 0) * (c.apr / 12),
    0
  );
  const totalBasePayment = Object.values(basePayments).reduce(
    (s, v) => s + Math.max(0, v),
    0
  );
  const estimatedExtra = extraEst.base;

  if (totalBasePayment + estimatedExtra <= totalInterest * 0.5) {
    return [];
  }

  const lastDate = parse(lastEntry.month, "yyyy-MM", new Date());
  const projections: ProjectionRow[] = [];
  const simBalances = { ...balances };

  for (let i = 1; i <= maxMonths; i++) {
    // 1. Accrue interest
    cards.forEach((card) => {
      if (simBalances[card.id] > 0) {
        simBalances[card.id] *= 1 + card.apr / 100 / 12;
      }
    });

    // 2. Subtract base payments (with trend extrapolation, clamped to non-negative)
    cards.forEach((card) => {
      const base = basePayments[card.id] || 0;
      const trend = paymentTrends[card.id] || 0;
      // Payment evolves with trend but floors at 0
      const payment = Math.max(0, base + trend * i);
      if (simBalances[card.id] > 0 && payment > 0) {
        simBalances[card.id] = Math.max(0, simBalances[card.id] - payment);
      }
    });

    // 3. Extra payment with trend (floored at 0)
    const extraPayment = Math.max(0, extraEst.base + extraEst.trend * i);
    if (extraPayment > 0) {
      const allocations = calculateAllocations(cards, simBalances, extraPayment);
      allocations.forEach((alloc) => {
        if (simBalances[alloc.cardId] > 0) {
          simBalances[alloc.cardId] = Math.max(
            0,
            simBalances[alloc.cardId] - alloc.amount
          );
        }
      });
    }

    // Build row
    const projDate = addMonths(lastDate, i);
    const monthStr = format(projDate, "MMM yy");
    const rowBalances: Record<string, number> = {};
    let total = 0;

    cards.forEach((card) => {
      const bal = Math.round(simBalances[card.id] * 100) / 100;
      simBalances[card.id] = bal;
      rowBalances[card.id] = bal;
      total += bal;
    });

    projections.push({
      month: monthStr,
      balances: rowBalances,
      total: Math.round(total * 100) / 100,
    });

    if (total <= 0) break;
  }

  return projections;
}
