import { Github, Info } from "lucide-react";
import { Link } from "react-router-dom";

const GITHUB_URL = "https://github.com/thamarakandabada/finviz";

export function AppFooter() {
  return (
    <footer className="border-t border-border py-4 mt-8">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <Github className="h-3.5 w-3.5" />
          GitHub
        </a>
        <span className="text-border">·</span>
        <Link
          to="/colophon"
          className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <Info className="h-3.5 w-3.5" />
          Colophon
        </Link>
      </div>
    </footer>
  );
}
