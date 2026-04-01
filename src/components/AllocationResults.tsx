import { Allocation } from "@/lib/types";

interface AllocationResultsProps {
  allocations: Allocation[];
  totalPayment: number;
}

export function AllocationResults({ allocations, totalPayment }: AllocationResultsProps) {
  const activeAllocations = allocations.filter(a => a.amount > 0);

  if (activeAllocations.length === 0 || totalPayment <= 0) {
    return null;
  }

  

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Payment Allocation
      </h2>
      <div className="space-y-2">
        {activeAllocations
          .sort((a, b) => b.amount - a.amount)
          .map((alloc) => (
            <div key={alloc.cardId} className="p-3 rounded-lg bg-card border border-border h-24 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm text-card-foreground">{alloc.cardName}</span>
                <span className="font-mono font-bold text-primary text-sm">
                  £{alloc.amount.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${alloc.weightPercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <p className="text-xs text-muted-foreground font-mono">
                  {alloc.weightPercent.toFixed(1)}% of total
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  Balance: £{alloc.balance.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
