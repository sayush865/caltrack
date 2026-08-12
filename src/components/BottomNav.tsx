import { BookOpen, Home, Plus, TrendingUp, User, type LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";

import { useLogSheet } from "@/components/LogSheet";

interface TabDef {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
}

const LEFT_TABS: TabDef[] = [
  { to: "/", icon: Home, label: "Today", end: true },
  { to: "/log", icon: BookOpen, label: "Diary" },
];

const RIGHT_TABS: TabDef[] = [
  { to: "/insights", icon: TrendingUp, label: "Insights" },
  { to: "/you", icon: User, label: "You" },
];

function Tab({ to, icon: Icon, label, end }: TabDef) {
  return (
    <NavLink
      to={to}
      end={end}
      className="flex h-12 w-16 flex-col items-center justify-center gap-0.5 transition-transform duration-instant active:scale-[0.97]"
    >
      {({ isActive }) => (
        <>
          <Icon className={`h-6 w-6 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
          <span className={`text-[11px] font-medium leading-none ${isActive ? "text-primary" : "text-muted-foreground"}`}>
            {label}
          </span>
          <span
            aria-hidden
            className={`h-1 w-1 rounded-full ${isActive ? "bg-primary" : "bg-transparent"}`}
          />
        </>
      )}
    </NavLink>
  );
}

const BottomNav = () => {
  const { openLogSheet } = useLogSheet();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/85 pb-safe backdrop-blur-lg [transform:translateZ(0)] [will-change:transform] [backface-visibility:hidden] supports-[height:100dvh]:bottom-0"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex h-nav w-full max-w-md items-center justify-around px-2">

        {LEFT_TABS.map((tab) => (
          <Tab key={tab.to} {...tab} />
        ))}

        <button
          type="button"
          aria-label="Log something"
          onClick={() => openLogSheet()}
          className="flex h-14 w-14 -translate-y-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-raised transition-transform duration-instant active:scale-[0.92]"
        >
          <Plus className="h-[26px] w-[26px]" strokeWidth={2.5} />
        </button>

        {RIGHT_TABS.map((tab) => (
          <Tab key={tab.to} {...tab} />
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
