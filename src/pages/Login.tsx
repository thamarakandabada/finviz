import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import balrogImg from "@/assets/balrog.jpg";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    try {
      const res = await supabase.functions.invoke("login", {
        body: { email: email.trim(), password },
      });

      if (res.error || !res.data?.session) {
        const errorData = res.data;
        if (errorData?.error === "banned") {
          toast.error("You shall not pass.");
        } else {
          toast.error("Access denied");
        }
        return;
      }

      // Set the session from the edge function response
      await supabase.auth.setSession(res.data.session);
    } catch {
      toast.error("Access denied");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-6">
          <div className="w-56 h-56 mx-auto rounded-full overflow-hidden border-2 border-muted/20 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
               style={{ background: "radial-gradient(circle, hsl(var(--card)) 0%, hsl(var(--background)) 100%)" }}>
            <img
              src={balrogImg}
              alt="Balrog of Morgoth by Álvaro Fernández González"
              className="w-full h-full object-cover opacity-80"
            />
          </div>
          <p className="text-lg font-mono text-muted-foreground">
            You have delved too deep.
            <br />
            <span className="italic">Turn back.</span>
          </p>
          <a
            href="https://thamara.co.uk"
            className="text-sm text-muted-foreground/70 hover:text-primary transition-colors underline underline-offset-4 font-medium"
          >
            Fly
          </a>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors py-2"
          >
            <ChevronDown
              className={`h-3 w-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </button>

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "..." : "Enter"}
              </Button>
            </form>
          </div>
        </div>
      </div>

      <p className="absolute bottom-4 left-0 right-0 text-[10px] text-muted-foreground/40 text-center">
        Art by{" "}
        <a
          href="https://www.artstation.com/artwork/4N1a82"
          className="underline hover:text-muted-foreground/60 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Álvaro Fernández González
        </a>
      </p>
    </div>
  );
}
