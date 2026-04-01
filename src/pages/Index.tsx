import { useAuth } from "@/components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { CreditCard, Globe, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const tools = [
  {
    category: "Financial Tools",
    icon: CreditCard,
    items: [
      {
        name: "Debt Allocator",
        description: "Optimise extra payments across credit cards using the avalanche method",
        path: "/debt-allocator",
      },
      {
        name: "Financial Dashboard",
        description: "Upload monthly CSVs to track net worth, income vs expenses, and spending breakdown",
        path: "/finances",
      },
    ],
  },
  {
    category: "Web Tools",
    icon: Globe,
    items: [
      {
        name: "Link Rot Watchdog",
        description: "Crawl your site every 90 days, check outbound links, and flag any 404s",
        path: "/link-rot",
      },
    ],
  },
];

const Index = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {tools.map((group) => (
            <section key={group.category} className="space-y-3">
              <div className="flex items-center gap-2">
                <group.icon className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {group.category}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {group.items.map((tool) => (
                  <button
                    key={tool.path}
                    onClick={() => navigate(tool.path)}
                    className="group p-4 rounded-lg bg-card border border-border hover:border-primary/40 hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all duration-200 text-left space-y-2"
                  >
                    <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {tool.description}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
