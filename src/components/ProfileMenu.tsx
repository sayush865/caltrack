import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Settings, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ProfileMenu() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, email')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setUsername(profile.username || '');
        setEmail(profile.email || user.email || '');
      } else {
        setEmail(user.email || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getInitials = () => {
    if (username) {
      return username.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none group">
        <Avatar className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/50 transition-all duration-300 group-hover:scale-110 shadow-lg">
          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold text-sm sm:text-base">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-card/95 backdrop-blur-xl border-border/50 z-50 shadow-2xl animate-scale-in">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2 p-1">
            <p className="text-sm font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {username || 'User'}
            </p>
            <p className="text-xs leading-none text-muted-foreground font-medium">
              {email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-border to-transparent" />
        <DropdownMenuItem 
          onClick={() => navigate('/settings')}
          className="cursor-pointer hover:bg-primary/10 transition-colors group"
        >
          <Settings className="mr-3 h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
          <span className="font-medium">Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-border to-transparent" />
        <DropdownMenuItem 
          onClick={handleLogout}
          className="cursor-pointer text-destructive hover:bg-destructive/10 focus:text-destructive transition-colors group"
        >
          <LogOut className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
