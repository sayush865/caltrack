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
    <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border/50 z-50 safe-area-inset-bottom shadow-2xl">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent pointer-events-none" />
      
      <div className="relative flex items-center justify-around h-16 sm:h-18 md:h-20 px-2 sm:px-4 max-w-screen-xl mx-auto">
        {navItems.map(({ to, icon: Icon, label, isAdd }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 px-2 sm:px-3 py-2 rounded-2xl transition-all duration-300 ${
                isAdd
                  ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground -mt-8 sm:-mt-9 md:-mt-10 p-4 sm:p-4.5 md:p-5 rounded-full shadow-2xl shadow-primary/50 scale-110 hover:scale-115 active:scale-105'
                  : isActive
                  ? 'text-primary bg-gradient-to-br from-primary/10 to-accent/10 shadow-md scale-105'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-105'
              }`
            }
          >
            {isAdd && (
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
            )}
            <Icon className={`relative z-10 transition-transform ${isAdd ? 'w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8' : 'w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6'}`} />
            {!isAdd && (
              <span className="text-[10px] sm:text-xs font-semibold tracking-wide">{label}</span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
