import { CreditCard } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface CardListProps {
  cards: CreditCard[];
  balances: Record<string, number>;
  onUpdateBalance: (id: string, balance: number) => void;
  onUpdateCreditLimit: (id: string, limit: number) => void;
  onRemove: (id: string) => void;
}

export function CardList({ cards, balances, onUpdateBalance, onUpdateCreditLimit, onRemove }: CardListProps) {
  if (cards.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No cards yet. Add your first card below.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {cards.map((card) => {
        const balance = balances[card.id] || 0;
        const utilisation = card.creditLimit > 0 ? (balance / card.creditLimit) * 100 : 0;
        const utilisationColor =
          utilisation > 75 ? "text-destructive" : utilisation > 50 ? "text-warning" : "text-accent";
        const barColor =
          utilisation > 75 ? "bg-destructive" : utilisation > 50 ? "bg-warning" : "bg-accent";

        return (
          <div
            key={card.id}
            className="p-3 rounded-lg bg-card border border-border h-24 flex flex-col justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-card-foreground">{card.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{card.apr}% APR</p>
              </div>

              {/* Credit Limit */}
              <div className="w-28">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">Limit £</span>
                  <Input
                    type="number"
                    step="100"
                    min="0"
                    placeholder="0"
                    value={card.creditLimit || ""}
                    onChange={(e) => onUpdateCreditLimit(card.id, parseFloat(e.target.value) || 0)}
                    className="pl-11 font-mono text-xs h-8"
                  />
                </div>
              </div>

              {/* Balance */}
              <div className="w-32">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">£</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={balance || ""}
                    onChange={(e) => onUpdateBalance(card.id, parseFloat(e.target.value) || 0)}
                    className="pl-7 font-mono text-xs h-8"
                  />
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(card.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Utilisation bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${Math.min(utilisation, 100)}%` }}
                />
              </div>
              <span className={`text-xs font-mono whitespace-nowrap ${utilisationColor}`}>
                {utilisation.toFixed(0)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
