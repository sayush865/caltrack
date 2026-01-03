import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import caltrackLogo from "@/assets/caltrack-logo.png";
import { authSignUpSchema, authSignInSchema } from '@/lib/validation';

// Rate limiting constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const STORAGE_KEY = 'login_attempts';

interface LoginAttempts {
  timestamps: number[];
  lockoutUntil: number | null;
}

const getLoginAttempts = (): LoginAttempts => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return { timestamps: [], lockoutUntil: null };
};

const saveLoginAttempts = (attempts: LoginAttempts) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
};

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [lastUsernameCheck, setLastUsernameCheck] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const USERNAME_CHECK_DELAY = 2000;

  // Check lockout status on mount and update countdown
  useEffect(() => {
    const checkLockout = () => {
      const attempts = getLoginAttempts();
      if (attempts.lockoutUntil && attempts.lockoutUntil > Date.now()) {
        setLockoutTime(attempts.lockoutUntil);
      } else if (attempts.lockoutUntil) {
        // Lockout expired, clear it
        saveLoginAttempts({ timestamps: [], lockoutUntil: null });
        setLockoutTime(null);
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUsernameAvailability = async (usernameToCheck: string) => {
    if (usernameToCheck.length < 3) {
      setUsernameError('');
      return;
    }

    const now = Date.now();
    if (now - lastUsernameCheck < USERNAME_CHECK_DELAY) {
      return;
    }
    setLastUsernameCheck(now);

    // Use secure RPC function for case-insensitive check
    const { data, error } = await supabase.rpc('check_username_exists', {
      lookup_username: usernameToCheck
    });

    if (!error && data === true) {
      setUsernameError('Username already taken. Please try a different one.');
    } else {
      setUsernameError('');
    }
  };

  const recordFailedAttempt = () => {
    const attempts = getLoginAttempts();
    const now = Date.now();
    
    // Filter out old attempts
    const recentAttempts = attempts.timestamps.filter(
      t => now - t < LOCKOUT_DURATION
    );
    recentAttempts.push(now);

    if (recentAttempts.length >= MAX_LOGIN_ATTEMPTS) {
      const lockoutUntil = now + LOCKOUT_DURATION;
      saveLoginAttempts({ timestamps: recentAttempts, lockoutUntil });
      setLockoutTime(lockoutUntil);
    } else {
      saveLoginAttempts({ timestamps: recentAttempts, lockoutUntil: null });
    }
  };

  const clearLoginAttempts = () => {
    saveLoginAttempts({ timestamps: [], lockoutUntil: null });
    setLockoutTime(null);
  };

  const isLockedOut = () => {
    return lockoutTime !== null && lockoutTime > Date.now();
  };

  const getRemainingLockoutTime = () => {
    if (!lockoutTime) return '';
    const remaining = Math.max(0, lockoutTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (usernameError) {
      toast({
        title: 'Invalid username',
        description: usernameError,
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);

    try {
      const validationResult = authSignUpSchema.safeParse({
        username,
        email,
        password,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        throw new Error(firstError.message);
      }

      const { error } = await supabase.auth.signUp({
        email: validationResult.data.email,
        password: validationResult.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username: validationResult.data.username
          }
        }
      });

      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('already registered')) {
          errorMessage = 'This email is already registered. Please sign in instead.';
        }
        throw new Error(errorMessage);
      }

      toast({
        title: 'Account created!',
        description: 'Welcome to CalTrack AI. You can start tracking your nutrition.',
      });
    } catch (error: any) {
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLockedOut()) {
      toast({
        title: 'Too many attempts',
        description: `Please wait ${getRemainingLockoutTime()} before trying again.`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const validationResult = authSignInSchema.safeParse({
        identifier,
        password,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        throw new Error(firstError.message);
      }

      let loginEmail = validationResult.data.identifier;

      // Check if identifier is a username (no @ symbol) - use case-insensitive RPC
      if (!validationResult.data.identifier.includes('@')) {
        const { data: email, error } = await supabase.rpc('get_email_by_username', {
          lookup_username: validationResult.data.identifier
        });

        if (error || !email) {
          recordFailedAttempt();
          throw new Error('Invalid username or password');
        }

        loginEmail = email;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: validationResult.data.password,
      });

      if (error) {
        recordFailedAttempt();
        throw error;
      }

      // Clear attempts on successful login
      clearLoginAttempts();

      toast({
        title: 'Welcome back!',
        description: 'Successfully signed in.',
      });
    } catch (error: any) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border border-border bg-card">
        <CardHeader className="text-center space-y-4 pb-8">
          <img src={caltrackLogo} alt="CalTrack AI Logo" className="w-24 h-24 mx-auto" />
          <div className="space-y-2">
            <CardTitle className="text-4xl font-bold tracking-tight">CalTrack AI</CardTitle>
            <CardDescription className="text-base">Smart Calorie & Nutrition Tracking</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLockedOut() && (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Too many failed attempts</p>
                <p className="text-sm text-muted-foreground">Try again in {getRemainingLockoutTime()}</p>
              </div>
            </div>
          )}
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted h-12">
              <TabsTrigger value="signin" className="text-base">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="text-base">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-6">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signin-identifier" className="text-base">Username or Email</Label>
                  <Input
                    id="signin-identifier"
                    type="text"
                    placeholder="username or email@example.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-11 bg-background border-border"
                    required
                    disabled={isLockedOut()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-base">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 bg-background border-border pr-10"
                      required
                      disabled={isLockedOut()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 text-base" disabled={loading || isLockedOut()}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-username" className="text-base">Username</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => {
                      const newUsername = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').substring(0, 20);
                      setUsername(newUsername);
                      setTimeout(() => checkUsernameAvailability(newUsername), 500);
                    }}
                    className={`h-11 bg-background border-border ${usernameError ? 'border-destructive' : ''}`}
                    required
                    minLength={3}
                    maxLength={20}
                  />
                  {usernameError && (
                    <p className="text-sm text-destructive">{usernameError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-base">Email Address</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 bg-background border-border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-base">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password (min 8 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 bg-background border-border pr-10"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
