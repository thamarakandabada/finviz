import { useState, useEffect, useMemo } from "react";
import { format, parse } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { CreditCard, MonthlyEntry } from "@/lib/types";
import { projectToZero } from "@/lib/projection";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const COLORS = [
  "hsl(199, 89%, 48%)",
  "hsl(160, 60%, 40%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(270, 60%, 55%)",
  "hsl(190, 70%, 50%)",
  "hsl(330, 60%, 55%)",
  "hsl(50, 80%, 50%)",
];

const Trends = () => {
  const { user } = useAuth();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [entries, setEntries] = useState<MonthlyEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchCards = async () => {
      const { data, error } = await supabase
        .from("credit_cards")
        .select("id, name, apr, credit_limit")
        .order("created_at");
      if (error) {
        toast.error("Failed to load cards");
      } else {
        setCards(
          (data || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            apr: Number(c.apr),
            creditLimit: Number(c.credit_limit),
          }))
        );
      }
    };
    const fetchEntries = async () => {
      const { data, error } = await supabase
        .from("monthly_entries")
        .select("month, balances, extra_payment");
      if (error) {
        toast.error("Failed to load entries");
      } else {
        setEntries(
          (data || []).map((e: any) => ({
            month: e.month,
            balances: (e.balances || {}) as Record<string, number>,
            extraPayment: Number(e.extra_payment),
          }))
        );
      }
    };
    Promise.all([fetchCards(), fetchEntries()]).finally(() => setLoading(false));
  }, [user]);

  const { projectedData, fullData } = useMemo(() => {
    if (entries.length === 0 || cards.length === 0) {
      return { historicalData: [], projectedData: [], fullData: [] };
    }

    const sorted = [...entries].sort((a, b) => a.month.localeCompare(b.month));

    const historical = sorted.map((entry) => {
      const row: Record<string, string | number | null> = {
        month: format(parse(entry.month, "yyyy-MM", new Date()), "MMM yy"),
      };
      let total = 0;
      cards.forEach((card) => {
        const bal = entry.balances[card.id] || 0;
        row[card.name] = bal;
        row[`${card.name} (projected)`] = null;
        total += bal;
      });
      row["Total"] = total;
      row["Total (projected)"] = null;
      return row;
    });

    // Use the robust projection engine
    const projectionRows = projectToZero(cards, sorted);

    const projected = projectionRows.map((pr) => {
      const row: Record<string, string | number | null> = { month: pr.month };
      cards.forEach((card) => {
        row[`${card.name} (projected)`] = pr.balances[card.id] ?? 0;
        row[card.name] = null;
      });
      row["Total (projected)"] = pr.total;
      row["Total"] = null;
      return row;
    });

    // Bridge: last historical point duplicated as first projection point
    if (historical.length > 0 && projected.length > 0) {
      const bridge: Record<string, string | number | null> = { ...historical[historical.length - 1] };
      const lastEntry = sorted[sorted.length - 1];
      let bridgeTotal = 0;
      cards.forEach((card) => {
        const bal = lastEntry.balances[card.id] || 0;
        bridge[`${card.name} (projected)`] = bal;
        bridgeTotal += bal;
      });
      bridge["Total (projected)"] = bridgeTotal;

      const fullHistorical = [...historical.slice(0, -1), bridge];
      return {
        historicalData: historical,
        projectedData: projected,
        fullData: [...fullHistorical, ...projected],
      };
    }

    return {
      historicalData: historical,
      projectedData: projected,
      fullData: historical,
    };
  }, [cards, entries]);

  // Find projected zero month
  const zeroMonth = useMemo(() => {
    if (projectedData.length === 0) return null;
    const zeroRow = projectedData.find(
      (row) => (row["Total (projected)"] as number) <= 0
    );
    return zeroRow ? (zeroRow.month as string) : null;
  }, [projectedData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <AppHeader />

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Balance Trends & Projection
            </h2>
            {zeroMonth && (
              <span className="text-xs font-medium text-accent">
                Debt-free by {zeroMonth} ✓
              </span>
            )}
          </div>

          {fullData.length === 0 ? (
            <div className="p-8 rounded-lg bg-card border border-border text-center text-muted-foreground text-sm">
              Add balance data for at least one month to see trends. Two months needed for projections.
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-card border border-border">
              <ResponsiveContainer width="100%" height={750}>
                <LineChart data={fullData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }}
                    axisLine={{ stroke: "hsl(220, 20%, 16%)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }}
                    axisLine={{ stroke: "hsl(220, 20%, 16%)" }}
                    tickLine={false}
                    tickFormatter={(v) => `£${v.toLocaleString()}`}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(222, 40%, 9%)",
                      border: "1px solid hsl(220, 20%, 16%)",
                      borderRadius: "0.5rem",
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "hsl(210, 40%, 92%)", fontWeight: 600 }}
                    formatter={(value: number | null) =>
                      value !== null
                        ? [`£${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, undefined]
                        : ["-", undefined]
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine y={0} stroke="hsl(160, 60%, 40%)" strokeDasharray="6 3" strokeWidth={1} />

                  {/* Historical lines – solid */}
                  <Line
                    type="monotone"
                    dataKey="Total"
                    stroke="hsl(210, 40%, 92%)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(210, 40%, 92%)" }}
                    connectNulls={false}
                  />
                  {cards.map((card, i) => (
                    <Line
                      key={card.id}
                      type="monotone"
                      dataKey={card.name}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={1.5}
                      dot={{ r: 2, fill: COLORS[i % COLORS.length] }}
                      connectNulls={false}
                    />
                  ))}

                  {/* Projected lines – dashed */}
                  <Line
                    type="monotone"
                    dataKey="Total (projected)"
                    stroke="hsl(210, 40%, 92%)"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={{ r: 2, fill: "hsl(210, 40%, 92%)" }}
                    connectNulls={false}
                  />
                  {cards.map((card, i) => (
                    <Line
                      key={`${card.id}-proj`}
                      type="monotone"
                      dataKey={`${card.name} (projected)`}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                      dot={{ r: 2, fill: COLORS[i % COLORS.length] }}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Trends;
