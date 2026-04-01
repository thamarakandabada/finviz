import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface CardFormProps {
  onAdd: (name: string, apr: number, creditLimit: number) => void;
}

export function CardForm({ onAdd }: CardFormProps) {
  const [name, setName] = useState("");
  const [apr, setApr] = useState("");
  const [creditLimit, setCreditLimit] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const aprNum = parseFloat(apr);
    const limitNum = parseFloat(creditLimit);
    if (!name.trim() || isNaN(aprNum) || aprNum <= 0 || isNaN(limitNum) || limitNum <= 0) return;
    onAdd(name.trim(), aprNum, limitNum);
    setName("");
    setApr("");
    setCreditLimit("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="card-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Card Name
        </Label>
        <Input
          id="card-name"
          placeholder="e.g. Barclaycard"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="w-24 space-y-1.5">
        <Label htmlFor="card-apr" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          APR %
        </Label>
        <Input
          id="card-apr"
          type="number"
          step="0.1"
          min="0"
          placeholder="22.9"
          value={apr}
          onChange={(e) => setApr(e.target.value)}
        />
      </div>
      <div className="w-28 space-y-1.5">
        <Label htmlFor="card-limit" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Limit £
        </Label>
        <Input
          id="card-limit"
          type="number"
          step="1"
          min="0"
          placeholder="5000"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
        />
      </div>
      <Button type="submit" size="icon" className="shrink-0">
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
}
