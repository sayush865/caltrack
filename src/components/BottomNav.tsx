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
    <nav className="fixed bottom-0 left-0 right-0 bg-card z-50 safe-area-inset-bottom shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-around h-20 px-6 max-w-screen-xl mx-auto">
        {navItems.map(({ to, icon: Icon, label, isAdd }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl transition-all min-w-[64px] ${
                isAdd
                  ? 'bg-foreground text-background -mt-10 p-4 rounded-full shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2),0_8px_24px_-4px_rgba(0,0,0,0.15)] scale-110'
                  : isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            <Icon className={isAdd ? 'w-7 h-7' : 'w-6 h-6'} strokeWidth={isAdd ? 2.5 : 2} />
            {!isAdd && (
              <span className={`text-[11px] font-semibold tracking-tight ${({ isActive }: { isActive: boolean }) => isActive ? '' : ''}`}>
                {label}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
