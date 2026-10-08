import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Users, LogOut, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const items = [
  { to: "/panel", label: "Panel", icon: LayoutDashboard },
  { to: "/personas", label: "Personas", icon: Users },
  { to: "/reportes", label: "Reportes", icon: BarChart3 },
] as const;

export function AppNav() {
  const navigate = useNavigate();
  return (
    <nav className="flex items-center gap-1">
      {items.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-primary-foreground/75 transition hover:bg-primary-foreground/10 hover:text-primary-foreground"
          activeProps={{ className: "bg-primary-foreground/15 !text-primary-foreground" }}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden md:inline">{label}</span>
        </Link>
      ))}
      <Button
        variant="ghost"
        size="icon"
        title="Cerrar sesión"
        className="text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground"
        onClick={async () => {
          await supabase.auth.signOut();
          navigate({ to: "/auth" });
        }}
      >
        <LogOut />
      </Button>
    </nav>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-foreground/10 font-bold tracking-tight">UMA</div>
          <div>
            <h1 className="text-base font-semibold leading-tight">{title}</h1>
            <p className="text-xs text-primary-foreground/70">{subtitle}</p>
          </div>
        </div>
        <div className="ml-auto">
          <AppNav />
        </div>
      </div>
    </header>
  );
}
