import { Home, FileText, Camera, Target, User } from "lucide-react";
import { NavLink } from "react-router-dom";

const BottomNav = () => {
  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/daily-log", icon: FileText, label: "Log" },
    { to: "/camera", icon: Camera, label: "Add", isAdd: true },
    { to: "/goals", icon: Target, label: "Goals" },
    { to: "/settings", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-4 max-w-screen-xl mx-auto">
        {navItems.map(({ to, icon: Icon, label, isAdd }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all ${
                isAdd
                  ? 'bg-foreground text-background -mt-8 p-4 rounded-full shadow-lg'
                  : isActive
                  ? 'text-foreground bg-secondary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`
            }
          >
            <Icon className={isAdd ? 'w-6 h-6' : 'w-5 h-5'} />
            {!isAdd && (
              <span className="text-[10px] font-medium">{label}</span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
