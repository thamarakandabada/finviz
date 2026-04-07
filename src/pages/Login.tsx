import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DEMO_MODE, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/app-config";
import { AppFooter } from "@/components/AppFooter";

export function LoginPage() {
  const [email, setEmail] = useState(DEMO_MODE ? DEMO_EMAIL : "");
  const [password, setPassword] = useState(DEMO_MODE ? DEMO_PASSWORD : "");
  const [loading, setLoading] = useState(false);

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
          toast.error("Access denied.");
        } else {
          toast.error("Invalid credentials");
        }
        return;
      }

      await supabase.auth.setSession(res.data.session);
    } catch {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
          {DEMO_MODE && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-400 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-300">Demo Mode</p>
                <p className="mt-1 leading-relaxed">
                  This is a read-only demo with sample data. To use FinViz with your own data,{" "}
                  <a
                    href="https://github.com/thamarakandabada/finviz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-yellow-300 hover:text-yellow-100"
                  >
                    self-host your own instance
                  </a>.
                </p>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
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
            <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
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
            {loading ? "Signing in…" : DEMO_MODE ? "Try the demo" : "Sign in"}
          </Button>
        </form>
      </div>
      <AppFooter />
    </div>
  );
}
