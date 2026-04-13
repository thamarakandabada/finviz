import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, Github, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DEMO_MODE, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/app-config";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export function LoginPage() {
  const [email, setEmail] = useState(DEMO_MODE ? DEMO_EMAIL : "");
  const [password, setPassword] = useState(DEMO_MODE ? DEMO_PASSWORD : "");
  const [loading, setLoading] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const failCount = useRef(0);

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;
  const lockoutRemaining = isLockedOut ? Math.ceil((lockoutUntil! - Date.now()) / 1000) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    if (isLockedOut) {
      toast.error(`Too many attempts. Try again in ${lockoutRemaining}s`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        failCount.current += 1;
        if (failCount.current >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_SECONDS * 1000;
          setLockoutUntil(until);
          failCount.current = 0;
          setTimeout(() => setLockoutUntil(null), LOCKOUT_SECONDS * 1000);
          toast.error(`Too many failed attempts. Locked for ${LOCKOUT_SECONDS}s`);
        } else {
          toast.error("Invalid credentials");
        }
      } else {
        failCount.current = 0;
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {DEMO_MODE && (
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>
                  <span className="font-semibold text-foreground">Welcome to the FinViz demo.</span>{" "}
                  This instance is loaded with sample financial data so you can explore the full dashboard — upload, delete, and play around freely. Data resets automatically every hour.
                </p>
                <p>
                  Sign in with <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">{DEMO_EMAIL}</span>{" "}
                  / <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">{DEMO_PASSWORD}</span> — the credentials are pre-filled below.
                </p>
                <p>
                  Want to use FinViz with your own data?{" "}
                  <a
                    href="https://github.com/thamarakandabada/finviz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Github className="h-3.5 w-3.5" />
                    Self-host from GitHub
                  </a>{" "}
                  or read the{" "}
                  <a
                    href="/colophon"
                    className="text-primary hover:underline"
                  >
                    Colophon
                  </a>{" "}
                  for more about the project.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
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
          <Button type="submit" className="w-full" disabled={loading || isLockedOut}>
            {isLockedOut
              ? `Locked (${lockoutRemaining}s)`
              : loading
                ? "Signing in…"
                : DEMO_MODE
                  ? "Try the demo"
                  : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
