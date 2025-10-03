import { Home, FileText, Camera, Target, User } from "lucide-react";
import { NavLink } from "react-router-dom";

const BottomNav = () => {
  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/daily-log", icon: FileText, label: "Log" },
    { to: "/camera", icon: Camera, label: "Add" },
    { to: "/goals", icon: Target, label: "Goals" },
    { to: "/settings", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="relative bg-foreground text-background rounded-t-[32px] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-around h-20 px-6 max-w-screen-xl mx-auto pb-safe">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1.5 px-4 py-2 transition-all ${
                  isActive
                    ? 'text-background'
                    : 'text-muted/60 hover:text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[11px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
