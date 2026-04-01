import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { CreditCard, Home, LogOut, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
      isActive
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
    );

  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Debt Allocator</h1>
            <p className="text-xs text-muted-foreground">
              Prioritise extra payments by APR &amp; balance
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1 ml-4">
          <NavLink to="/debt-allocator" end className={linkClass}>
            <CreditCard className="h-3.5 w-3.5" />
            Dashboard
          </NavLink>
          <NavLink to="/trends" className={linkClass}>
            <TrendingDown className="h-3.5 w-3.5" />
            Trends
          </NavLink>
        </nav>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
          <Home className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
