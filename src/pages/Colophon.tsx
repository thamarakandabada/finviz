import { ArrowLeft, Github } from "lucide-react";
import { Link } from "react-router-dom";
import { AppFooter } from "@/components/AppFooter";

const GITHUB_URL = "https://github.com/thamarakandabada/finviz";

export default function Colophon() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 max-w-2xl mx-auto px-4 py-12 space-y-8">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Colophon</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            About how FinViz is built.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Tech Stack</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><span className="text-foreground font-medium">Frontend:</span> React 18, TypeScript, Vite 5, Tailwind CSS v3</li>
            <li><span className="text-foreground font-medium">UI:</span> shadcn/ui, Radix Primitives, Lucide icons</li>
            <li><span className="text-foreground font-medium">Charts:</span> Recharts (bar, area, Sankey diagrams)</li>
            <li><span className="text-foreground font-medium">Backend:</span> Supabase (Postgres, Auth, Edge Functions)</li>
            <li><span className="text-foreground font-medium">Deployment:</span> Docker Compose (self-hosted) or any static host</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Purpose</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            FinViz turns CSV exports from double-entry bookkeeping apps — like{" "}
            <span className="text-foreground">Finances 2</span> — into
            interactive visualisations. It&apos;s designed as a single-user,
            self-hosted tool where you own your data entirely.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Typography</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><span className="text-foreground font-medium">Body:</span> DM Sans</li>
            <li><span className="text-foreground font-medium">Monospace:</span> JetBrains Mono</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Source</h2>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Github className="h-4 w-4" />
            {GITHUB_URL.replace("https://", "")}
          </a>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">License</h2>
          <p className="text-sm text-muted-foreground">
            MIT — free to use, modify, and redistribute.
          </p>
        </section>
      </div>
      <AppFooter />
    </div>
  );
}
