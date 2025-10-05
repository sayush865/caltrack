import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Apple, Eye, EyeOff } from 'lucide-react';
import { authSignUpSchema, authSignInSchema } from '@/lib/validation';

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
  const USERNAME_CHECK_DELAY = 2000; // 2 second delay between checks

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

    // Rate limiting: prevent rapid username enumeration
    const now = Date.now();
    if (now - lastUsernameCheck < USERNAME_CHECK_DELAY) {
      return;
    }
    setLastUsernameCheck(now);

    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', usernameToCheck)
      .maybeSingle();

    if (data) {
      setUsernameError('Username already taken. Please try a different one.');
    } else {
      setUsernameError('');
    }
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
      // Validate inputs
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
    setLoading(true);

    try {
      // Validate inputs
      const validationResult = authSignInSchema.safeParse({
        identifier,
        password,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        throw new Error(firstError.message);
      }

      let loginEmail = validationResult.data.identifier;

      // Check if identifier is a username (no @ symbol)
      if (!validationResult.data.identifier.includes('@')) {
        const { data, error } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', validationResult.data.identifier)
          .maybeSingle();

        if (error || !data) {
          throw new Error('Invalid username or password');
        }

        loginEmail = data.email;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: validationResult.data.password,
      });

      if (error) throw error;

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
          <div className="mx-auto w-20 h-20 bg-primary rounded-xl flex items-center justify-center">
            <Apple className="w-12 h-12 text-primary-foreground" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-4xl font-bold tracking-tight">CalTrack AI</CardTitle>
            <CardDescription className="text-base">Smart Calorie & Nutrition Tracking</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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
                      // Debounced username check to prevent enumeration
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
