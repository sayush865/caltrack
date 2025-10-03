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
      <div className="flex items-center justify-around h-16 sm:h-18 md:h-20 px-2 sm:px-4">
        {navItems.map(({ to, icon: Icon, label, isAdd }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all ${
                isAdd
                  ? 'bg-primary text-primary-foreground -mt-6 sm:-mt-7 md:-mt-8 p-3 sm:p-3.5 md:p-4 rounded-full shadow-lg scale-110'
                  : isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`
            }
          >
            <Icon className={isAdd ? 'w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7' : 'w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6'} />
            {!isAdd && (
              <span className="text-[10px] sm:text-xs font-medium">{label}</span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
