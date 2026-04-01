import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload, Trash2, TrendingUp, TrendingDown, DollarSign,
  PieChart, ArrowUpRight, ArrowDownRight, Minus, Calendar, FileText,
  Database, ChevronDown, ChevronUp, LogOut,
} from "lucide-react";
import FinancialReport from "@/components/FinancialReport";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  parseFinanceCSV,
  classifyAccount,
  isTransfer,
  isOpeningBalance,
  isIlliquidAccount,
  isIlliquidIncome,
  topCategory,
  type RawTransaction,
} from "@/lib/csv-parser";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend, Sankey, Rectangle,
} from "recharts";

const COLORS = [
  "hsl(199, 89%, 48%)", "hsl(160, 60%, 40%)", "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)", "hsl(270, 60%, 55%)", "hsl(320, 60%, 50%)",
  "hsl(90, 50%, 45%)", "hsl(20, 80%, 50%)", "hsl(200, 50%, 60%)",
  "hsl(50, 80%, 50%)", "hsl(180, 50%, 40%)", "hsl(140, 50%, 50%)",
];

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(222, 40%, 9%)",
  border: "1px solid hsl(220, 20%, 16%)",
  borderRadius: "8px",
  fontSize: 12,
  color: "hsl(210, 40%, 92%)",
};

const TOOLTIP_ITEM_STYLE = { color: "hsl(210, 40%, 92%)" };

const AXIS_TICK = { fontSize: 10, fill: "hsl(215, 15%, 55%)" };
const GRID_STROKE = "hsl(220, 20%, 16%)";

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

// ─── helpers ───
function normTx(t: DbTx) {
  return { ...t, counterAccount: t.counter_account || "", category: t.category || "" };
}

function computeMonthStats(txs: DbTx[]) {
  let income = 0;
  let expenses = 0;
  let ccInterest = 0;
  let loanInterest = 0;
  const catExp: Record<string, number> = {};
  const catInc: Record<string, number> = {};

  txs.forEach((t) => {
    const tx = normTx(t);
    if (isOpeningBalance(tx as any) || isTransfer(tx as any)) return;

    const amt = Number(t.amount);
    const acctType = classifyAccount(t.account);

    if (amt > 0 && acctType === "asset") {
      if (tx.category) {
        const cat = topCategory(tx.category);
        // Exclude illiquid income (e.g. Pension Growth) from income/savings metrics
        if (!isIlliquidIncome(tx.category)) {
          income += amt;
          catInc[cat] = (catInc[cat] || 0) + amt;
        }
      }
    } else if (amt < 0 && tx.category) {
      const isInterestOnLiability = acctType === "liability" && tx.category.startsWith("Interest");
      if (isInterestOnLiability) {
        const lower = t.account.toLowerCase();
        if (lower.includes("loan")) {
          loanInterest += Math.abs(amt);
        } else {
          ccInterest += Math.abs(amt);
        }
      } else {
        expenses += Math.abs(amt);
        const cat = topCategory(tx.category);
        catExp[cat] = (catExp[cat] || 0) + Math.abs(amt);
      }
    }
  });

  return { income, expenses, ccInterest, loanInterest, catExp, catInc };
}

function computeBalances(txs: DbTx[]) {
  const balances: Record<string, number> = {};
  txs.forEach((t) => {
    balances[t.account] = (balances[t.account] || 0) + Number(t.amount);

    // For transfers, credit the counter account with the inverse amount.
    // e.g. Nationwide -50 (counter_account=Revolut) means Revolut receives +50.
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

function toPieData(map: Record<string, number>) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
}

// ─── component ───
export default function FinancialDashboard() {
  const { session, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [reportType, setReportType] = useState<"year-end" | "6-month" | "12-month" | null>(null);
  const [showDataManager, setShowDataManager] = useState(false);

  const userId = session?.user?.id;

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["financial_transactions", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .order("date", { ascending: true });
      if (error) throw error;
      return data as DbTx[];
    },
    enabled: !!userId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (rows: RawTransaction[]) => {
      if (!userId) throw new Error("Not authenticated");
      const firstReal = rows.find((r) => !isOpeningBalance(r));
      const monthDate = firstReal ? new Date(firstReal.date) : new Date(rows[0].date);
      const uploadMonth = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

      await supabase
        .from("financial_transactions")
        .delete()
        .eq("user_id", userId)
        .eq("upload_month", uploadMonth);

      const inserts = rows.map((r) => ({
        user_id: userId,
        date: r.date,
        account: r.account,
        amount: r.amount,
        currency: r.currency,
        category: r.category || null,
        counter_account: r.counterAccount || null,
        note: r.note || null,
        payee: r.payee || null,
        cleared: r.cleared,
        upload_month: uploadMonth,
      }));

      for (let i = 0; i < inserts.length; i += 50) {
        const { error } = await supabase.from("financial_transactions").insert(inserts.slice(i, i + 50));
        if (error) throw error;
      }
      return { count: rows.length, month: uploadMonth };
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      toast({ title: "Upload complete", description: `${r.count} transactions for ${fmtMonth(r.month)}` });
    },
    onError: (e: Error) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const text = await file.text();
      const rows = parseFinanceCSV(text);
      if (!rows.length) { toast({ title: "Empty file", variant: "destructive" }); return; }
      await uploadMutation.mutateAsync(rows);
    } catch {
      toast({ title: "Parse error", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }, [uploadMutation]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase.from("financial_transactions").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      toast({ title: "Data cleared" });
    },
  });

  const deleteMonthMutation = useMutation({
    mutationFn: async (month: string) => {
      if (!userId) return;
      const { error } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("user_id", userId)
        .eq("upload_month", month);
      if (error) throw error;
      return month;
    },
    onSuccess: (month) => {
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      if (selectedMonth === month) setSelectedMonth("all");
      toast({ title: "Month deleted", description: `Removed data for ${fmtMonth(month || "")}` });
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach((t) => {
      counts[t.upload_month] = (counts[t.upload_month] || 0) + 1;
    });
    return counts;
  }, [transactions]);

  // ─── computed ───
  const allMonths = useMemo(
    () => [...new Set(transactions.map((t) => t.upload_month))].sort(),
    [transactions]
  );

  const computed = useMemo(() => {
    if (!transactions.length) return null;

    // Per-month stats for the summary table and MoM comparison
    const monthlyStats = allMonths.map((month) => {
      const monthTxs = transactions.filter((t) => t.upload_month === month);
      // Balances: sum all txs up to and including this month
      const txsUpTo = transactions.filter((t) => t.upload_month <= month);
      const balances = computeBalances(txsUpTo);
      const stats = computeMonthStats(monthTxs);
      return { month, ...stats, ...balances };
    });

    // Filtered txs for the selected view
    const viewTxs =
      selectedMonth === "all"
        ? transactions
        : transactions.filter((t) => t.upload_month === selectedMonth);

    // Current view stats
    const viewStats = computeMonthStats(viewTxs);
    // For balance sheet, use cumulative up to the selected (or latest) month
    const balanceMonth = selectedMonth === "all" ? allMonths[allMonths.length - 1] : selectedMonth;
    const cumulativeTxs = transactions.filter((t) => t.upload_month <= balanceMonth);
    const viewBalances = computeBalances(cumulativeTxs);

    const savingsRate = viewStats.income > 0
      ? ((viewStats.income - viewStats.expenses) / viewStats.income) * 100
      : 0;

    // Debt-to-Income ratio
    const debtToIncome = viewStats.income > 0
      ? (viewBalances.liabilities / viewStats.income) * 100
      : 0;

    // Expense velocity: daily average spend & projected month-end total
    const viewMonthCount = selectedMonth === "all" ? allMonths.length : 1;
    const daysInPeriod = viewMonthCount * 30;
    const dailySpend = daysInPeriod > 0 ? viewStats.expenses / daysInPeriod : 0;
    // For current month projection: figure out day of month
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projectedMonthEnd = selectedMonth !== "all" && dayOfMonth < daysInCurrentMonth
      ? (viewStats.expenses / Math.max(dayOfMonth, 1)) * daysInCurrentMonth
      : 0;

    // Top 3 spending categories
    const top3Categories = Object.entries(viewStats.catExp)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, value]) => ({ name, value, pct: viewStats.expenses > 0 ? (value / viewStats.expenses) * 100 : 0 }));

    // MoM delta (compare selected month to the one before it)
    let prevStats: ReturnType<typeof computeMonthStats> | null = null;
    if (selectedMonth !== "all") {
      const idx = allMonths.indexOf(selectedMonth);
      if (idx > 0) {
        const prevTxs = transactions.filter((t) => t.upload_month === allMonths[idx - 1]);
        prevStats = computeMonthStats(prevTxs);
      }
    } else if (allMonths.length >= 2) {
      // Compare the last two months
      const prevTxs = transactions.filter((t) => t.upload_month === allMonths[allMonths.length - 2]);
      prevStats = computeMonthStats(prevTxs);
    }

    // Net worth trend (end-of-month snapshots for the long-term chart)
    const netWorthTrend = monthlyStats.map((s) => ({
      month: fmtMonth(s.month),
      assets: Math.round(s.assets * 100) / 100,
      liabilities: Math.round(s.liabilities * 100) / 100,
      netWorth: Math.round(s.netWorth * 100) / 100,
    }));

    // Monthly income vs expenses bar chart
    const incomeVsExpenseMonthly = monthlyStats.map((s) => ({
      month: fmtMonth(s.month),
      income: Math.round(s.income * 100) / 100,
      expenses: Math.round(s.expenses * 100) / 100,
      net: Math.round((s.income - s.expenses) * 100) / 100,
    }));

    // Savings rate trend
    const savingsRateTrend = monthlyStats.map((s) => ({
      month: fmtMonth(s.month),
      rate: s.income > 0 ? Math.round(((s.income - s.expenses) / s.income) * 1000) / 10 : 0,
      saved: Math.round((s.income - s.expenses) * 100) / 100,
    }));

    // Pie data for selected period
    const expensePieData = toPieData(viewStats.catExp);
    const incomePieData = toPieData(viewStats.catInc);

    // Accounts for balance sheet
    const assetAccounts = viewBalances.list.filter((a) => a.type === "asset").sort((a, b) => b.balance - a.balance);
    const liabilityAccounts = viewBalances.list.filter((a) => a.type === "liability").sort((a, b) => a.balance - b.balance);

    // Expense forecast using weighted moving average (more recent months weighted higher)
    let expenseForecast: { total: number; byCategory: { name: string; predicted: number; trend: "up" | "down" | "stable" }[]; confidence: string } | null = null;
    if (monthlyStats.length >= 2) {
      // Use up to last 6 months with exponential weights
      const recentMonths = monthlyStats.slice(-6);
      let totalWeight = 0;
      let weightedSum = 0;
      const categoryWeightedSums: Record<string, number> = {};
      const categoryWeights: Record<string, number> = {};
      const categoryRecent: Record<string, number[]> = {};

      recentMonths.forEach((s, i) => {
        const weight = Math.pow(1.5, i); // Exponential: older=1, newest=~7.6
        totalWeight += weight;
        weightedSum += s.expenses * weight;

        Object.entries(s.catExp).forEach(([cat, amt]) => {
          categoryWeightedSums[cat] = (categoryWeightedSums[cat] || 0) + amt * weight;
          categoryWeights[cat] = (categoryWeights[cat] || 0) + weight;
          if (!categoryRecent[cat]) categoryRecent[cat] = [];
          categoryRecent[cat].push(amt);
        });
      });

      const predictedTotal = totalWeight > 0 ? weightedSum / totalWeight : 0;
      
      // Predict by category with trend
      const byCategory = Object.entries(categoryWeightedSums)
        .map(([name, sum]) => {
          const predicted = categoryWeights[name] > 0 ? sum / categoryWeights[name] : 0;
          const recent = categoryRecent[name] || [];
          let trend: "up" | "down" | "stable" = "stable";
          if (recent.length >= 2) {
            const lastTwo = recent.slice(-2);
            const change = (lastTwo[1] - lastTwo[0]) / Math.max(lastTwo[0], 1);
            if (change > 0.1) trend = "up";
            else if (change < -0.1) trend = "down";
          }
          return { name, predicted: Math.round(predicted * 100) / 100, trend };
        })
        .sort((a, b) => b.predicted - a.predicted)
        .slice(0, 5);

      // Confidence based on data points
      const confidence = monthlyStats.length >= 6 ? "High" : monthlyStats.length >= 3 ? "Medium" : "Low";

      expenseForecast = {
        total: Math.round(predictedTotal * 100) / 100,
        byCategory,
        confidence,
      };
    }

    // Life runway forecaster
    let lifeRunway: { monthsRunway: number; avgMonthlyBurn: number; liquidAssets: number; depletionCurve: { month: string; remaining: number }[] } | null = null;
    if (monthlyStats.length >= 1) {
      const avgMonthlyBurn = monthlyStats.reduce((s, m) => s + m.expenses, 0) / monthlyStats.length;
      const liquidAssets = viewBalances.list
        .filter((a) => a.type === "asset" && !isIlliquidAccount(a.name))
        .reduce((s, a) => s + a.balance, 0);
      const monthsRunway = avgMonthlyBurn > 0 ? liquidAssets / avgMonthlyBurn : Infinity;

      // Build depletion curve — project forward month by month
      const depletionCurve: { month: string; remaining: number }[] = [];
      const maxMonths = Math.min(Math.ceil(monthsRunway) + 2, 120); // cap at 10 years
      const lastMonth = allMonths[allMonths.length - 1];
      const [ly, lm] = lastMonth.split("-").map(Number);

      for (let i = 0; i <= maxMonths && (liquidAssets - avgMonthlyBurn * i) >= -avgMonthlyBurn; i++) {
        const d = new Date(ly, lm - 1 + i, 1);
        const label = `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]} ${d.getFullYear()}`;
        depletionCurve.push({
          month: label,
          remaining: Math.max(0, Math.round((liquidAssets - avgMonthlyBurn * i) * 100) / 100),
        });
      }

      lifeRunway = { monthsRunway, avgMonthlyBurn, liquidAssets, depletionCurve };
    }

    return {
      income: viewStats.income,
      expenses: viewStats.expenses,
      ccInterest: viewStats.ccInterest,
      loanInterest: viewStats.loanInterest,
      savingsRate,
      debtToIncome,
      dailySpend,
      projectedMonthEnd,
      top3Categories,
      ...viewBalances,
      prevStats,
      netWorthTrend,
      incomeVsExpenseMonthly,
      savingsRateTrend,
      expensePieData,
      incomePieData,
      assetAccounts,
      liabilityAccounts,
      monthlyStats,
      expenseForecast,
      lifeRunway,
    };
  }, [transactions, selectedMonth, allMonths]);

  // ─── delta helper ───
  const DeltaBadge = ({ current, previous, invert }: { current: number; previous?: number; invert?: boolean }) => {
    if (previous === undefined || previous === 0) return null;
    const pct = ((current - previous) / Math.abs(previous)) * 100;
    const positive = invert ? pct < 0 : pct > 0;
    const Icon = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${positive ? "text-accent" : "text-destructive"}`}>
        <Icon className="h-3 w-3" />
        {Math.abs(pct).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">Financial Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            {allMonths.length > 0 && (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-36 h-9 text-xs">
                  <Calendar className="h-3 w-3 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  {allMonths.map((m) => (
                    <SelectItem key={m} value={m}>{fmtMonth(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant={showDataManager ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowDataManager(!showDataManager)}
            >
              <Database className="h-3.5 w-3.5 mr-1.5" />
              Manage Data
              {showDataManager ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
            </Button>
          </div>
        </div>

        {/* Data Manager Panel */}
        {showDataManager && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">CSV Data Manager</CardTitle>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <Input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    <Button asChild variant="outline" size="sm" disabled={uploading}>
                      <span><Upload className="h-3.5 w-3.5 mr-1.5" />{uploading ? "Uploading…" : "Upload CSV"}</span>
                    </Button>
                  </label>
                  {transactions.length > 0 && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate()}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />Clear All
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {allMonths.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No data uploaded yet. Upload a CSV to get started.</p>
              ) : (
                <div className="space-y-1">
                  {allMonths.map((m) => (
                    <div
                      key={m}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{fmtMonth(m)}</p>
                          <p className="text-[10px] text-muted-foreground">{monthCounts[m]} transactions</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity h-7"
                        onClick={() => deleteMonthMutation.mutate(m)}
                        disabled={deleteMonthMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                      </Button>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border mt-2">
                    <p className="text-[10px] text-muted-foreground">
                      Total: {transactions.length} transactions across {allMonths.length} month{allMonths.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Report view */}
        {reportType && transactions.length > 0 && (
          <FinancialReport
            transactions={transactions as any}
            allMonths={allMonths}
            reportType={reportType}
            onClose={() => setReportType(null)}
          />
        )}

        {/* Report buttons */}
        {!reportType && transactions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1"><FileText className="h-3.5 w-3.5 inline mr-1" />Reports:</span>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setReportType("year-end")}>Year-End</Button>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setReportType("6-month")}>6 Month</Button>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setReportType("12-month")}>12 Month</Button>
          </div>
        )}

        {/* Loading / empty */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && !computed && (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Upload className="h-10 w-10 mx-auto mb-4 opacity-40" />
              <p className="text-sm">Upload a CSV file to get started</p>
              <p className="text-xs mt-1 opacity-60">
                Supports: date, account, amount, currency, category, counter account, note, payee, number, cleared
              </p>
            </CardContent>
          </Card>
        )}

        {computed && !reportType && (
          <>
            {/* Summary cards with MoM deltas */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              <SummaryCard
                title="Net Worth"
                value={fmt(computed.netWorth)}
                icon={<DollarSign className="h-4 w-4" />}
                accent={computed.netWorth >= 0 ? "text-accent" : "text-destructive"}
              />
              <SummaryCard
                title="Income"
                value={fmt(computed.income)}
                icon={<TrendingUp className="h-4 w-4" />}
                accent="text-accent"
                delta={computed.prevStats && <DeltaBadge current={computed.income} previous={computed.prevStats.income} />}
              />
              <SummaryCard
                title="Expenses"
                value={fmt(computed.expenses)}
                icon={<TrendingDown className="h-4 w-4" />}
                accent="text-destructive"
                delta={computed.prevStats && <DeltaBadge current={computed.expenses} previous={computed.prevStats.expenses} invert />}
              />
              <SummaryCard
                title="Savings Rate"
                value={`${computed.savingsRate.toFixed(1)}%`}
                icon={<PieChart className="h-4 w-4" />}
                accent={computed.savingsRate >= 0 ? "text-accent" : "text-destructive"}
              />
              <SummaryCard
                title="Total Debt"
                value={fmt(computed.liabilities)}
                icon={<TrendingDown className="h-4 w-4" />}
                accent="text-destructive"
              />
              <SummaryCard
                title="Debt-to-Income"
                value={`${computed.debtToIncome.toFixed(1)}%`}
                icon={<TrendingDown className="h-4 w-4" />}
                accent={computed.debtToIncome <= 36 ? "text-accent" : computed.debtToIncome <= 50 ? "text-yellow-500" : "text-destructive"}
                subtitle={computed.debtToIncome <= 36 ? "Healthy" : computed.debtToIncome <= 50 ? "Moderate" : "High"}
              />
              <SummaryCard
                title="Interest Paid"
                value={fmt(computed.ccInterest + computed.loanInterest)}
                icon={<DollarSign className="h-4 w-4" />}
                accent="text-destructive"
                subtitle={`CC: ${fmt(computed.ccInterest)} · Loan: ${fmt(computed.loanInterest)}`}
              />
              <SummaryCard
                title="Daily Spend"
                value={fmt(computed.dailySpend)}
                icon={<Calendar className="h-4 w-4" />}
                accent="text-muted-foreground"
                subtitle={computed.projectedMonthEnd > 0 ? `Projected: ${fmt(computed.projectedMonthEnd)}` : `${fmt(computed.dailySpend * 30)}/mo avg`}
              />
            </div>

            {/* Top 3 Spending Categories */}
            {computed.top3Categories.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Top Spending Categories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {computed.top3Categories.map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground w-4">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-foreground font-medium">{cat.name}</span>
                          <span className="text-muted-foreground">{fmt(cat.value)} ({cat.pct.toFixed(1)}%)</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${cat.pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Expense Forecast */}
            {computed.expenseForecast && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Next Month Expense Forecast</CardTitle>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      computed.expenseForecast.confidence === "High" ? "bg-accent/15 text-accent" :
                      computed.expenseForecast.confidence === "Medium" ? "bg-yellow-500/15 text-yellow-500" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {computed.expenseForecast.confidence} confidence
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-2xl font-bold text-foreground">{fmt(computed.expenseForecast.total)}</span>
                    <span className="text-xs text-muted-foreground">predicted total</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Top categories</p>
                    {computed.expenseForecast.byCategory.map((cat) => (
                      <div key={cat.name} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground">{cat.name}</span>
                          <span className={`text-[10px] ${
                            cat.trend === "up" ? "text-destructive" :
                            cat.trend === "down" ? "text-accent" :
                            "text-muted-foreground"
                          }`}>
                            {cat.trend === "up" ? "↑ rising" : cat.trend === "down" ? "↓ falling" : "→ stable"}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">{fmt(cat.predicted)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Life Runway Forecaster */}
            {computed.lifeRunway && computed.lifeRunway.avgMonthlyBurn > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Life Runway Forecaster</CardTitle>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      computed.lifeRunway.monthsRunway >= 12 ? "bg-accent/15 text-accent" :
                      computed.lifeRunway.monthsRunway >= 6 ? "bg-yellow-500/15 text-yellow-500" :
                      "bg-destructive/15 text-destructive"
                    }`}>
                      {computed.lifeRunway.monthsRunway >= 12 ? "Healthy" :
                       computed.lifeRunway.monthsRunway >= 6 ? "Caution" : "Critical"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-[10px] text-muted-foreground mb-3">
                    How long your liquid assets would last if all income stopped, based on average spending.
                  </p>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Liquid Assets</p>
                      <p className="text-lg font-bold text-foreground">{fmt(computed.lifeRunway.liquidAssets)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Monthly Burn</p>
                      <p className="text-lg font-bold text-destructive">{fmt(computed.lifeRunway.avgMonthlyBurn)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Runway</p>
                      <p className="text-lg font-bold text-foreground">
                        {computed.lifeRunway.monthsRunway === Infinity
                          ? "∞"
                          : `${Math.floor(computed.lifeRunway.monthsRunway)} mo`}
                      </p>
                      {computed.lifeRunway.monthsRunway !== Infinity && computed.lifeRunway.monthsRunway >= 12 && (
                        <p className="text-[10px] text-muted-foreground">
                          ({(computed.lifeRunway.monthsRunway / 12).toFixed(1)} years)
                        </p>
                      )}
                    </div>
                  </div>
                  {computed.lifeRunway.depletionCurve.length > 1 && (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={computed.lifeRunway.depletionCurve}>
                          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                          <XAxis dataKey="month" tick={AXIS_TICK} interval={Math.max(0, Math.floor(computed.lifeRunway.depletionCurve.length / 6))} />
                          <YAxis tick={AXIS_TICK} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} formatter={(v: number) => fmt(v)} />
                          <defs>
                            <linearGradient id="runwayGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="remaining"
                            stroke="hsl(38, 92%, 50%)"
                            fill="url(#runwayGrad)"
                            strokeWidth={2}
                            name="Remaining Assets"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Net Worth Trend (always all-time) */}
            {computed.netWorthTrend.length > 1 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Net Worth Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={computed.netWorthTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis dataKey="month" tick={AXIS_TICK} />
                        <YAxis tick={AXIS_TICK} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} formatter={(v: number) => fmt(v)} />
                        <Area type="monotone" dataKey="assets" stroke="hsl(160, 60%, 40%)" fill="hsl(160, 60%, 40%)" fillOpacity={0.3} name="Assets" />
                        <Area type="monotone" dataKey="liabilities" stroke="hsl(0, 72%, 51%)" fill="hsl(0, 72%, 51%)" fillOpacity={0.2} name="Liabilities" />
                        <Area type="monotone" dataKey="netWorth" stroke="hsl(199, 89%, 48%)" fill="hsl(199, 89%, 48%)" fillOpacity={0.15} name="Net Worth" />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Monthly Income vs Expenses (always all-time) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monthly Income vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={computed.incomeVsExpenseMonthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                      <XAxis dataKey="month" tick={AXIS_TICK} />
                      <YAxis tick={AXIS_TICK} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="income" fill="hsl(160, 60%, 40%)" radius={[4, 4, 0, 0]} name="Income" />
                      <Bar dataKey="expenses" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Expenses" />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Savings Rate Trend */}
            {computed.savingsRateTrend.length > 1 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Savings Rate Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={computed.savingsRateTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis dataKey="month" tick={AXIS_TICK} />
                        <YAxis tick={AXIS_TICK} tickFormatter={(v) => `${v}%`} />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          itemStyle={TOOLTIP_ITEM_STYLE}
                          formatter={(v: number, name: string) =>
                            name === "rate" ? `${v}%` : fmt(v)
                          }
                        />
                        <defs>
                          <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="rate"
                          stroke="hsl(199, 89%, 48%)"
                          fill="url(#savingsGrad)"
                          strokeWidth={2}
                          name="Savings Rate %"
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
            {computed.monthlyStats.length > 1 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left py-2 pr-4 font-medium">Month</th>
                          <th className="text-right py-2 px-3 font-medium">Income</th>
                          <th className="text-right py-2 px-3 font-medium">Expenses</th>
                          <th className="text-right py-2 px-3 font-medium">Net</th>
                          <th className="text-right py-2 px-3 font-medium">Assets</th>
                          <th className="text-right py-2 px-3 font-medium">Liabilities</th>
                          <th className="text-right py-2 pl-3 font-medium">Net Worth</th>
                        </tr>
                      </thead>
                      <tbody>
                        {computed.monthlyStats.map((s, i) => {
                          const net = s.income - s.expenses;
                          const prev = i > 0 ? computed.monthlyStats[i - 1] : null;
                          const nwDelta = prev ? s.netWorth - prev.netWorth : null;
                          return (
                            <tr
                              key={s.month}
                              className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                              onClick={() => setSelectedMonth(s.month)}
                            >
                              <td className="py-2 pr-4 font-medium text-foreground">{fmtMonth(s.month)}</td>
                              <td className="py-2 px-3 text-right text-accent">{fmt(s.income)}</td>
                              <td className="py-2 px-3 text-right text-destructive">{fmt(s.expenses)}</td>
                              <td className={`py-2 px-3 text-right font-medium ${net >= 0 ? "text-accent" : "text-destructive"}`}>
                                {fmt(net)}
                              </td>
                              <td className="py-2 px-3 text-right text-muted-foreground">{fmt(s.assets)}</td>
                              <td className="py-2 px-3 text-right text-muted-foreground">{fmt(s.liabilities)}</td>
                              <td className="py-2 pl-3 text-right">
                                <span className={`font-medium ${s.netWorth >= 0 ? "text-accent" : "text-destructive"}`}>
                                  {fmt(s.netWorth)}
                                </span>
                                {nwDelta !== null && (
                                  <span className={`ml-1.5 text-[10px] ${nwDelta >= 0 ? "text-accent" : "text-destructive"}`}>
                                    {nwDelta >= 0 ? "▲" : "▼"} {fmt(Math.abs(nwDelta))}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Expense Sankey Diagram — full width */}
            {computed.expensePieData.length > 0 && (
              <SankeyExpenseCard
                title={`Expense Breakdown${selectedMonth !== "all" ? ` — ${fmtMonth(selectedMonth)}` : ""}`}
                data={computed.expensePieData}
              />
            )}

            {/* Income Sources Sankey — full width */}
            {computed.incomePieData.length > 0 && (
              <SankeyIncomeCard
                title={`Income Sources${selectedMonth !== "all" ? ` — ${fmtMonth(selectedMonth)}` : ""}`}
                data={computed.incomePieData}
              />
            )}

            {/* Balance sheet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Assets — {fmt(computed.assets)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {computed.assetAccounts.map((a) => (
                    <div key={a.name} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                      <span className="text-muted-foreground">{a.name}</span>
                      <span className="font-medium text-accent">{fmt(a.balance)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Liabilities — {fmt(computed.liabilities)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {computed.liabilityAccounts.map((a) => (
                    <div key={a.name} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                      <span className="text-muted-foreground">{a.name}</span>
                      <span className="font-medium text-destructive">{fmt(Math.abs(a.balance))}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── sub-components ───

function SummaryCard({ title, value, icon, accent, delta, subtitle }: {
  title: string; value: string; icon: React.ReactNode; accent: string; delta?: React.ReactNode; subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{title}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <p className={`text-lg font-semibold ${accent}`}>{value}</p>
          {delta}
        </div>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}


function SankeyExpenseCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const sankeyData = useMemo(() => {
    const nodes = [{ name: "Total Expenses" }, ...data.map((d) => ({ name: d.name }))];
    const links = data.map((d, i) => ({
      source: 0,
      target: i + 1,
      value: d.value,
    }));
    return { nodes, links };
  }, [data]);

  const SankeyNode = ({ x, y, width, height, index, payload }: any) => {
    const color = index === 0 ? "hsl(0, 72%, 51%)" : COLORS[((index - 1) % COLORS.length)];
    return (
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={0.9}
        radius={[4, 4, 4, 4]}
      />
    );
  };

  const SankeyLink = (props: any) => {
    const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index } = props;
    const color = COLORS[index % COLORS.length];
    return (
      <path
        d={`
          M${sourceX},${sourceY + linkWidth / 2}
          C${sourceControlX},${sourceY + linkWidth / 2}
            ${targetControlX},${targetY + linkWidth / 2}
            ${targetX},${targetY + linkWidth / 2}
          L${targetX},${targetY - linkWidth / 2}
          C${targetControlX},${targetY - linkWidth / 2}
            ${sourceControlX},${sourceY - linkWidth / 2}
            ${sourceX},${sourceY - linkWidth / 2}
          Z
        `}
        fill={color}
        fillOpacity={0.3}
        stroke={color}
        strokeWidth={0}
      />
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={sankeyData}
              node={<SankeyNode />}
              link={<SankeyLink />}
              nodePadding={24}
              nodeWidth={12}
              margin={{ top: 10, right: 160, bottom: 10, left: 10 }}
            >
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                formatter={(v: number) => fmt(v)}
              />
            </Sankey>
          </ResponsiveContainer>
        </div>
        {/* Labels */}
        <div className="flex flex-wrap gap-3 mt-3">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span>{d.name}</span>
              <span className="font-medium text-foreground">{fmt(d.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SankeyIncomeCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const sankeyData = useMemo(() => {
    const nodes = [...data.map((d) => ({ name: d.name })), { name: "Total Income" }];
    const targetIdx = data.length;
    const links = data.map((d, i) => ({
      source: i,
      target: targetIdx,
      value: d.value,
    }));
    return { nodes, links };
  }, [data]);

  const SankeyNode = ({ x, y, width, height, index }: any) => {
    const color = index === data.length ? "hsl(160, 60%, 40%)" : COLORS[index % COLORS.length];
    return (
      <Rectangle x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.9} radius={[4, 4, 4, 4]} />
    );
  };

  const SankeyLink = (props: any) => {
    const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index } = props;
    const color = COLORS[index % COLORS.length];
    return (
      <path
        d={`
          M${sourceX},${sourceY + linkWidth / 2}
          C${sourceControlX},${sourceY + linkWidth / 2}
            ${targetControlX},${targetY + linkWidth / 2}
            ${targetX},${targetY + linkWidth / 2}
          L${targetX},${targetY - linkWidth / 2}
          C${targetControlX},${targetY - linkWidth / 2}
            ${sourceControlX},${sourceY - linkWidth / 2}
            ${sourceX},${sourceY - linkWidth / 2}
          Z
        `}
        fill={color}
        fillOpacity={0.3}
        stroke={color}
        strokeWidth={0}
      />
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={sankeyData}
              node={<SankeyNode />}
              link={<SankeyLink />}
              nodePadding={24}
              nodeWidth={12}
              margin={{ top: 10, right: 160, bottom: 10, left: 10 }}
            >
              <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} formatter={(v: number) => fmt(v)} />
            </Sankey>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span>{d.name}</span>
              <span className="font-medium text-foreground">{fmt(d.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
