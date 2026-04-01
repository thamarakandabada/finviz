import { format, addMonths, subMonths, isBefore, startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthNavigatorProps {
  currentMonth: Date;
  onChangeMonth: (date: Date) => void;
}

const MIN_MONTH = new Date(2026, 0, 1); // Jan 2026

export function MonthNavigator({ currentMonth, onChangeMonth }: MonthNavigatorProps) {
  const canGoBack = !isBefore(subMonths(currentMonth, 1), MIN_MONTH);

  return (
    <div className="flex items-center justify-between bg-card border border-border rounded-lg p-2.5 h-16">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChangeMonth(subMonths(currentMonth, 1))}
        disabled={!canGoBack}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="font-semibold text-sm text-card-foreground">
        {format(currentMonth, "MMMM yyyy")}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChangeMonth(addMonths(currentMonth, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
