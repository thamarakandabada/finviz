import { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { CreditCard, MonthlyEntry } from "@/lib/types";
import { calculateAllocations } from "@/lib/allocator";
import { CardForm } from "@/components/CardForm";
import { CardList } from "@/components/CardList";
import { AllocationResults } from "@/components/AllocationResults";
import { MonthNavigator } from "@/components/MonthNavigator";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const { user } = useAuth();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [entries, setEntries] = useState<MonthlyEntry[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [loading, setLoading] = useState(true);

  const monthKey = format(currentMonth, "yyyy-MM");

  // Load cards from DB
  useEffect(() => {
    if (!user) return;
    const fetchCards = async () => {
      const { data, error } = await supabase
        .from("credit_cards")
        .select("id, name, apr, credit_limit")
        .order("created_at");
      if (error) {
        toast.error("Failed to load cards");
        if (import.meta.env.DEV) console.error(error);
      } else {
        setCards((data || []).map((c: any) => ({ id: c.id, name: c.name, apr: Number(c.apr), creditLimit: Number(c.credit_limit) })));
      }
    };
    const fetchEntries = async () => {
      const { data, error } = await supabase
        .from("monthly_entries")
        .select("month, balances, extra_payment");
      if (error) {
        toast.error("Failed to load entries");
        if (import.meta.env.DEV) console.error(error);
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

  const currentEntry = useMemo(
    () => entries.find((e) => e.month === monthKey) || { month: monthKey, balances: {}, extraPayment: 0 },
    [entries, monthKey]
  );

  const upsertEntry = useCallback(
    async (patch: Partial<MonthlyEntry>) => {
      if (!user) return;
      const updated = { ...currentEntry, ...patch };

      // Optimistic local update
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.month === monthKey);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });

      const { error } = await supabase.from("monthly_entries").upsert(
        {
          user_id: user.id,
          month: monthKey,
          balances: updated.balances,
          extra_payment: updated.extraPayment,
        },
        { onConflict: "user_id,month" }
      );
      if (error) {
        toast.error("Failed to save entry");
        if (import.meta.env.DEV) console.error(error);
      }
    },
    [user, monthKey, currentEntry]
  );

  const addCard = async (name: string, apr: number, creditLimit: number) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("credit_cards")
      .insert({ user_id: user.id, name, apr, credit_limit: creditLimit })
      .select("id, name, apr, credit_limit")
      .single();
    if (error) {
      toast.error("Failed to add card");
      if (import.meta.env.DEV) console.error(error);
    } else if (data) {
      setCards((prev) => [...prev, { id: data.id, name: data.name, apr: Number(data.apr), creditLimit: Number(data.credit_limit) }]);
    }
  };

  const removeCard = async (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    const { error } = await supabase.from("credit_cards").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete card");
      if (import.meta.env.DEV) console.error(error);
    }
    // Clean up balances in all entries
    setEntries((prev) =>
      prev.map((e) => {
        const { [id]: _, ...rest } = e.balances;
        return { ...e, balances: rest };
      })
    );
  };

  const updateCreditLimit = async (id: string, limit: number) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, creditLimit: limit } : c)));
    const { error } = await supabase
      .from("credit_cards")
      .update({ credit_limit: limit })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update limit");
      if (import.meta.env.DEV) console.error(error);
    }
  };

  const updateBalance = (id: string, balance: number) => {
    upsertEntry({ balances: { ...currentEntry.balances, [id]: balance } });
  };

  const setExtraPayment = (amount: number) => {
    upsertEntry({ extraPayment: amount });
  };

  const allocations = useMemo(
    () => calculateAllocations(cards, currentEntry.balances, currentEntry.extraPayment),
    [cards, currentEntry]
  );

  // Totals
  const totalLimit = cards.reduce((s, c) => s + c.creditLimit, 0);
  const totalBalance = cards.reduce((s, c) => s + (currentEntry.balances[c.id] || 0), 0);
  const totalUtilisation = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;
  const totalUtilColor =
    totalUtilisation > 75 ? "text-destructive" : totalUtilisation > 50 ? "text-warning" : "text-accent";
  const totalBarColor =
    totalUtilisation > 75 ? "bg-destructive" : totalUtilisation > 50 ? "bg-warning" : "bg-accent";

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

        {/* Top controls bar: Month | Utilisation | Extra Payment */}
        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          <MonthNavigator currentMonth={currentMonth} onChangeMonth={setCurrentMonth} />

          {cards.length > 0 && (
            <>
              {/* Total utilisation */}
              <div className="flex-1 p-2.5 rounded-lg bg-card border border-border h-16 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Utilisation</span>
                  <span className={`text-xs font-mono font-bold ${totalUtilColor}`}>
                    {totalUtilisation.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden mb-1">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${totalBarColor}`}
                    style={{ width: `${Math.min(totalUtilisation, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground font-mono">£{totalBalance.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground font-mono">of £{totalLimit.toLocaleString()}</span>
                </div>
              </div>

              {/* Extra payment */}
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border h-16">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">Extra</span>
                <div className="relative w-24">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">£</span>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="100"
                    value={currentEntry.extraPayment || ""}
                    onChange={(e) => setExtraPayment(parseFloat(e.target.value) || 0)}
                    className="pl-6 font-mono h-8 text-sm"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Balances */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Statement Balances — {format(currentMonth, "MMM yyyy")}
            </h2>
            <CardList
              cards={cards}
              balances={currentEntry.balances}
              onUpdateBalance={updateBalance}
              onUpdateCreditLimit={updateCreditLimit}
              onRemove={removeCard}
            />
          </section>

          {/* Right: Allocation Results */}
          <div>
            <AllocationResults allocations={allocations} totalPayment={currentEntry.extraPayment} />
          </div>
        </div>

        {/* Add Card — bottom */}
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Add a Card
          </h2>
          <CardForm onAdd={addCard} />
        </section>
      </div>
    </div>
  );
};

export default Index;
