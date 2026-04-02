import { useMemo, useRef } from "react";
import { classifyAccount, isTransfer, isOpeningBalance, isIlliquidIncome, topCategory } from "@/lib/csv-parser";
import { fmt, fmtMonth } from "@/lib/app-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

type DbTx = {
  id: string;
  date: string;
  account: string;
  amount: number;
  currency: string;
  category: string | null;
  counter_account: string | null;
  note: string | null;
  payee: string | null;
  cleared: boolean;
  upload_month: string;
  user_id: string;
  created_at: string;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

const fmtMonth = (m: string) => {
  const [y, mo] = m.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[parseInt(mo) - 1]} ${y}`;
};

function normTx(t: DbTx) {
  return { ...t, counterAccount: t.counter_account || "", category: t.category || "" };
}

function computeStats(txs: DbTx[]) {
  let income = 0;
  let expenses = 0;
  const catExp: Record<string, number> = {};
  const catInc: Record<string, number> = {};
  let interestPaid = 0;

  txs.forEach((t) => {
    const tx = normTx(t);
    if (isOpeningBalance(tx as any) || isTransfer(tx as any)) return;
    const amt = Number(t.amount);
    const acctType = classifyAccount(t.account);

    if (amt > 0 && acctType === "asset" && tx.category) {
      if (!isIlliquidIncome(tx.category)) {
        income += amt;
        const cat = topCategory(tx.category);
        catInc[cat] = (catInc[cat] || 0) + amt;
      }
    } else if (amt < 0 && tx.category) {
      const isInterest = acctType === "liability" && tx.category.startsWith("Interest");
      if (isInterest) {
        interestPaid += Math.abs(amt);
      } else {
        expenses += Math.abs(amt);
        const cat = topCategory(tx.category);
        catExp[cat] = (catExp[cat] || 0) + Math.abs(amt);
      }
    }
  });

  return { income, expenses, interestPaid, catExp, catInc };
}

function computeBalances(txs: DbTx[]) {
  const balances: Record<string, number> = {};
  txs.forEach((t) => {
    balances[t.account] = (balances[t.account] || 0) + Number(t.amount);
    const counter = t.counter_account;
    if (counter && counter !== "Opening Balance") {
      balances[counter] = (balances[counter] || 0) - Number(t.amount);
    }
  });
  let assets = 0;
  let liabilities = 0;
  const list: { name: string; balance: number; type: "asset" | "liability" }[] = [];
  Object.entries(balances).forEach(([name, bal]) => {
    const type = classifyAccount(name);
    if (type === "asset") assets += bal;
    else liabilities += Math.abs(bal);
    list.push({ name, balance: bal, type });
  });
  return { assets, liabilities, netWorth: assets - liabilities, list };
}

interface FinancialReportProps {
  transactions: DbTx[];
  allMonths: string[];
  reportType: "year-end" | "6-month" | "12-month";
  onClose: () => void;
}

export default function FinancialReport({ transactions, allMonths, reportType, onClose }: FinancialReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  const reportData = useMemo(() => {
    if (!transactions.length || !allMonths.length) return null;

    // Determine which months to include
    let months: string[];
    const latest = allMonths[allMonths.length - 1];
    const [latestYear, latestMo] = latest.split("-").map(Number);

    if (reportType === "year-end") {
      // Calendar year of the latest month
      const year = latestYear.toString();
      months = allMonths.filter((m) => m.startsWith(year));
    } else {
      const count = reportType === "6-month" ? 6 : 12;
      months = allMonths.slice(-count);
    }

    if (!months.length) return null;

    const periodLabel =
      reportType === "year-end"
        ? `Year-End Report — ${latestYear}`
        : reportType === "6-month"
        ? `6-Month Report — ${fmtMonth(months[0])} to ${fmtMonth(months[months.length - 1])}`
        : `12-Month Report — ${fmtMonth(months[0])} to ${fmtMonth(months[months.length - 1])}`;

    // Period transactions (for income/expense)
    const periodTxs = transactions.filter((t) => months.includes(t.upload_month));
    const totals = computeStats(periodTxs);
    const savingsRate = totals.income > 0 ? ((totals.income - totals.expenses) / totals.income) * 100 : 0;

    // Opening balance (all txs before first month in report)
    const firstMonth = months[0];
    const openingTxs = transactions.filter((t) => t.upload_month < firstMonth);
    const openingBalances = computeBalances(openingTxs);

    // Closing balance (all txs up to and including last month)
    const lastMonth = months[months.length - 1];
    const closingTxs = transactions.filter((t) => t.upload_month <= lastMonth);
    const closingBalances = computeBalances(closingTxs);

    const netWorthChange = closingBalances.netWorth - openingBalances.netWorth;

    // Per-month breakdown
    const monthlyBreakdown = months.map((month) => {
      const mTxs = transactions.filter((t) => t.upload_month === month);
      const stats = computeStats(mTxs);
      const cumTxs = transactions.filter((t) => t.upload_month <= month);
      const bal = computeBalances(cumTxs);
      return {
        month,
        ...stats,
        ...bal,
      };
    });

    // Top expense categories (sorted)
    const sortedExpCats = Object.entries(totals.catExp)
      .sort((a, b) => b[1] - a[1]);

    // Top income sources
    const sortedIncCats = Object.entries(totals.catInc)
      .sort((a, b) => b[1] - a[1]);

    // Averages
    const avgIncome = totals.income / months.length;
    const avgExpenses = totals.expenses / months.length;

    return {
      periodLabel,
      months,
      totals,
      savingsRate,
      openingBalances,
      closingBalances,
      netWorthChange,
      monthlyBreakdown,
      sortedExpCats,
      sortedIncCats,
      avgIncome,
      avgExpenses,
    };
  }, [transactions, allMonths, reportType]);

  const handlePrint = () => {
    const el = reportRef.current;
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Financial Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px; color: #1a1a1a; font-size: 13px; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        h2 { font-size: 15px; margin: 20px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        h3 { font-size: 13px; margin: 12px 0 6px; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        th, td { padding: 4px 8px; text-align: right; border-bottom: 1px solid #eee; font-size: 12px; }
        th { font-weight: 600; text-align: right; background: #f5f5f5; }
        th:first-child, td:first-child { text-align: left; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 12px 0; }
        .summary-box { border: 1px solid #ddd; border-radius: 6px; padding: 10px; }
        .summary-box .label { font-size: 11px; color: #666; }
        .summary-box .value { font-size: 16px; font-weight: 600; margin-top: 2px; }
        .green { color: #16a34a; }
        .red { color: #dc2626; }
        .text-muted { color: #666; font-size: 11px; }
        .generated { color: #999; font-size: 10px; margin-top: 24px; }
        @media print { body { padding: 16px; } }
      </style></head><body>
      ${el.innerHTML}
      <p class="generated">Generated on ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
  };

  if (!reportData) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p className="text-sm">Not enough data to generate this report.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={onClose}>Back</Button>
        </CardContent>
      </Card>
    );
  }

  const r = reportData;

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onClose}>← Back to Dashboard</Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-3.5 w-3.5 mr-1.5" />Print / Save PDF
        </Button>
      </div>

      {/* Report content (also used for print) */}
      <div ref={reportRef}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{r.periodLabel}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {r.months.length} month{r.months.length > 1 ? "s" : ""} of data
              ({fmtMonth(r.months[0])} — {fmtMonth(r.months[r.months.length - 1])})
            </p>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Key metrics */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Key Metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricBox label="Total Income" value={fmt(r.totals.income)} accent="text-accent" />
                <MetricBox label="Total Expenses" value={fmt(r.totals.expenses)} accent="text-destructive" />
                <MetricBox label="Net Surplus / Deficit" value={fmt(r.totals.income - r.totals.expenses)} accent={r.totals.income >= r.totals.expenses ? "text-accent" : "text-destructive"} />
                <MetricBox label="Savings Rate" value={`${r.savingsRate.toFixed(1)}%`} accent={r.savingsRate >= 0 ? "text-accent" : "text-destructive"} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <MetricBox label="Avg Monthly Income" value={fmt(r.avgIncome)} />
                <MetricBox label="Avg Monthly Expenses" value={fmt(r.avgExpenses)} />
                <MetricBox label="Interest Paid" value={fmt(r.totals.interestPaid)} accent="text-destructive" />
                <MetricBox label="Net Worth Change" value={fmt(r.netWorthChange)} accent={r.netWorthChange >= 0 ? "text-accent" : "text-destructive"} />
              </div>
            </div>

            {/* Balance sheet comparison */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Balance Sheet — Opening vs Closing</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-medium">Metric</th>
                      <th className="text-right py-2 px-3 font-medium">Opening</th>
                      <th className="text-right py-2 px-3 font-medium">Closing</th>
                      <th className="text-right py-2 pl-3 font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    <BalanceRow label="Total Assets" opening={r.openingBalances.assets} closing={r.closingBalances.assets} />
                    <BalanceRow label="Total Liabilities" opening={r.openingBalances.liabilities} closing={r.closingBalances.liabilities} invert />
                    <BalanceRow label="Net Worth" opening={r.openingBalances.netWorth} closing={r.closingBalances.netWorth} bold />
                  </tbody>
                </table>
              </div>
            </div>

            {/* Account balances */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2">Asset Accounts</h3>
                {r.closingBalances.list
                  .filter((a) => a.type === "asset")
                  .sort((a, b) => b.balance - a.balance)
                  .map((a) => (
                    <div key={a.name} className="flex justify-between text-xs py-1 border-b border-border/50">
                      <span className="text-muted-foreground">{a.name}</span>
                      <span className="font-medium text-accent">{fmt(a.balance)}</span>
                    </div>
                  ))}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2">Liability Accounts</h3>
                {r.closingBalances.list
                  .filter((a) => a.type === "liability")
                  .sort((a, b) => a.balance - b.balance)
                  .map((a) => (
                    <div key={a.name} className="flex justify-between text-xs py-1 border-b border-border/50">
                      <span className="text-muted-foreground">{a.name}</span>
                      <span className="font-medium text-destructive">{fmt(Math.abs(a.balance))}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Expense breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-2">Expense Breakdown</h2>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-1.5 font-medium">Category</th>
                      <th className="text-right py-1.5 font-medium">Amount</th>
                      <th className="text-right py-1.5 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.sortedExpCats.map(([cat, amt]) => (
                      <tr key={cat} className="border-b border-border/30">
                        <td className="py-1.5 text-muted-foreground">{cat}</td>
                        <td className="py-1.5 text-right text-destructive">{fmt(amt)}</td>
                        <td className="py-1.5 text-right text-muted-foreground">
                          {((amt / r.totals.expenses) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                    <tr className="font-medium">
                      <td className="py-1.5">Total</td>
                      <td className="py-1.5 text-right text-destructive">{fmt(r.totals.expenses)}</td>
                      <td className="py-1.5 text-right">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-foreground mb-2">Income Sources</h2>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-1.5 font-medium">Source</th>
                      <th className="text-right py-1.5 font-medium">Amount</th>
                      <th className="text-right py-1.5 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.sortedIncCats.map(([cat, amt]) => (
                      <tr key={cat} className="border-b border-border/30">
                        <td className="py-1.5 text-muted-foreground">{cat}</td>
                        <td className="py-1.5 text-right text-accent">{fmt(amt)}</td>
                        <td className="py-1.5 text-right text-muted-foreground">
                          {((amt / r.totals.income) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                    <tr className="font-medium">
                      <td className="py-1.5">Total</td>
                      <td className="py-1.5 text-right text-accent">{fmt(r.totals.income)}</td>
                      <td className="py-1.5 text-right">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Monthly breakdown */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2">Monthly Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 pr-3 font-medium">Month</th>
                      <th className="text-right py-2 px-2 font-medium">Income</th>
                      <th className="text-right py-2 px-2 font-medium">Expenses</th>
                      <th className="text-right py-2 px-2 font-medium">Interest</th>
                      <th className="text-right py-2 px-2 font-medium">Net</th>
                      <th className="text-right py-2 px-2 font-medium">Assets</th>
                      <th className="text-right py-2 px-2 font-medium">Liabilities</th>
                      <th className="text-right py-2 pl-2 font-medium">Net Worth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.monthlyBreakdown.map((m) => {
                      const net = m.income - m.expenses;
                      return (
                        <tr key={m.month} className="border-b border-border/30">
                          <td className="py-1.5 pr-3 font-medium text-foreground">{fmtMonth(m.month)}</td>
                          <td className="py-1.5 px-2 text-right text-accent">{fmt(m.income)}</td>
                          <td className="py-1.5 px-2 text-right text-destructive">{fmt(m.expenses)}</td>
                          <td className="py-1.5 px-2 text-right text-muted-foreground">{fmt(m.interestPaid)}</td>
                          <td className={`py-1.5 px-2 text-right font-medium ${net >= 0 ? "text-accent" : "text-destructive"}`}>
                            {fmt(net)}
                          </td>
                          <td className="py-1.5 px-2 text-right text-muted-foreground">{fmt(m.assets)}</td>
                          <td className="py-1.5 px-2 text-right text-muted-foreground">{fmt(m.liabilities)}</td>
                          <td className={`py-1.5 pl-2 text-right font-medium ${m.netWorth >= 0 ? "text-accent" : "text-destructive"}`}>
                            {fmt(m.netWorth)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricBox({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${accent || "text-foreground"}`}>{value}</p>
    </div>
  );
}

function BalanceRow({ label, opening, closing, invert, bold }: {
  label: string; opening: number; closing: number; invert?: boolean; bold?: boolean;
}) {
  const change = closing - opening;
  const positive = invert ? change < 0 : change > 0;
  return (
    <tr className={`border-b border-border/30 ${bold ? "font-medium" : ""}`}>
      <td className="py-1.5 text-foreground">{label}</td>
      <td className="py-1.5 text-right text-muted-foreground">{fmt(opening)}</td>
      <td className="py-1.5 text-right text-foreground">{fmt(closing)}</td>
      <td className={`py-1.5 text-right ${positive ? "text-accent" : "text-destructive"}`}>
        {change >= 0 ? "+" : ""}{fmt(change)}
      </td>
    </tr>
  );
}
