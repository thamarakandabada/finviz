import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Search, LogOut, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function LinkRotHeader() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <Search className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Link Rot Watchdog</h1>
            <p className="text-xs text-muted-foreground">
              Crawl &amp; check outbound links for 404s
            </p>
          </div>
        </div>
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
