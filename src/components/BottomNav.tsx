import { Home, FileText, Plus, Target, User, Camera, Database, MessageSquare, BarChart3, Trophy, Dumbbell } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const BottomNav = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const leftNavItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/weekly-summary", icon: BarChart3, label: "Insights" },
  ];

  const rightNavItems = [
    { to: "/achievements", icon: Trophy, label: "Awards" },
    { to: "/settings", icon: User, label: "Profile" },
  ];

  const addOptions = [
    {
      icon: Camera,
      label: "Scan Food",
      description: "Take a photo to analyze nutrition",
      onClick: () => {
        setOpen(false);
        navigate("/camera");
      },
    },
    {
      icon: MessageSquare,
      label: "Type Food",
      description: "Describe what you ate",
      onClick: () => {
        setOpen(false);
        navigate("/text-food");
      },
    },
    {
      icon: Database,
      label: "Food Database",
      description: "Choose from our food database",
      onClick: () => {
        setOpen(false);
        navigate("/food-database");
      },
    },
    {
      icon: Dumbbell,
      label: "Log Exercise",
      description: "Track your workouts and burn calories",
      onClick: () => {
        setOpen(false);
        navigate("/exercise-database");
      },
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-4 max-w-screen-xl mx-auto">
        {leftNavItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all ${
                isActive
                  ? 'text-foreground bg-secondary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all bg-foreground text-background -mt-8 p-4 rounded-full shadow-lg">
              <Plus className="w-6 h-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle>Add Food</SheetTitle>
            </SheetHeader>
            <div className="grid gap-3 mt-6 mb-6">
              {addOptions.map((option) => (
                <Button
                  key={option.label}
                  variant="outline"
                  className="h-auto p-4 justify-start"
                  onClick={option.onClick}
                >
                  <option.icon className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
        
        {rightNavItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all ${
                isActive
                  ? 'text-foreground bg-secondary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
