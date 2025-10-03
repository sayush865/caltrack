import { Home, FileText, PlusCircle, Target, User } from "lucide-react";
import { NavLink } from "react-router-dom";

const BottomNav = () => {
  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/daily-log", icon: FileText, label: "Log" },
    { to: "/camera", icon: PlusCircle, label: "Add", isSpecial: true },
    { to: "/goals", icon: Target, label: "Goals" },
    { to: "/settings", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 flex-1 transition-colors ${
                  item.isSpecial
                    ? "text-primary"
                    : isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <item.icon className={item.isSpecial ? "h-8 w-8" : "h-5 w-5"} />
              <span className="text-xs">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
