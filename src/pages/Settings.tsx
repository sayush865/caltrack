import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Camera, User, Target, Activity, TrendingUp, Scale, AlertTriangle, ChevronRight, Edit, LogOut, Pencil, X } from 'lucide-react';
import { nutritionGoalsSchema, profileSchema } from '@/lib/validation';
import { WeightHistoryChart } from '@/components/WeightHistoryChart';
import { HealthMetrics } from '@/components/HealthMetrics';

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPersonalDetailsDialog, setShowPersonalDetailsDialog] = useState(false);
  const [showNutritionGoalsDialog, setShowNutritionGoalsDialog] = useState(false);
  const [showWeightGoalsDialog, setShowWeightGoalsDialog] = useState(false);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [showEditHeight, setShowEditHeight] = useState(false);
  const [showEditGender, setShowEditGender] = useState(false);
  const [showEditActivity, setShowEditActivity] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingAge, setEditingAge] = useState(false);
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    age: null as number | null,
    gender: null as string | null,
    height: null as number | null,
    activity_level: null as string | null,
    profile_picture_url: null as string | null,
    units_preference: 'imperial' as 'imperial' | 'metric',
  });
  const [goals, setGoals] = useState({
    daily_calories: 2000,
    daily_protein: 150,
    daily_carbs: 250,
    daily_fat: 65,
    current_weight: 0,
    goal_weight: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile({
          username: profileData.username || '',
          email: profileData.email || user.email || '',
          age: profileData.age,
          gender: profileData.gender,
          height: profileData.height ? Number(profileData.height) : null,
          activity_level: profileData.activity_level,
          profile_picture_url: profileData.profile_picture_url,
          units_preference: (profileData.units_preference as 'imperial' | 'metric') || 'imperial',
        });
      }

      const { data: goalsData } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (goalsData) {
        setGoals({
          daily_calories: goalsData.daily_calories,
          daily_protein: goalsData.daily_protein,
          daily_carbs: goalsData.daily_carbs,
          daily_fat: goalsData.daily_fat,
          current_weight: Number(goalsData.current_weight) || 0,
          goal_weight: Number(goalsData.goal_weight) || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingPicture(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/profile.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, profile_picture_url: publicUrl });
      toast({
        title: "Success!",
        description: "Profile picture updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload picture",
        variant: "destructive",
      });
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const validationResult = profileSchema.safeParse({
        age: profile.age,
        gender: profile.gender,
        height: profile.height,
        activity_level: profile.activity_level,
        units_preference: profile.units_preference,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        throw new Error(firstError.message);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          age: profile.age,
          gender: profile.gender,
          height: profile.height,
          activity_level: profile.activity_level,
          units_preference: profile.units_preference,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Profile updated successfully",
      });
      setShowPersonalDetailsDialog(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoals = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const validationResult = nutritionGoalsSchema.safeParse({
        daily_calories: goals.daily_calories,
        daily_protein: goals.daily_protein,
        daily_carbs: goals.daily_carbs,
        daily_fat: goals.daily_fat,
        current_weight: goals.current_weight || null,
        goal_weight: goals.goal_weight || null,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        throw new Error(firstError.message);
      }

      const { error } = await supabase
        .from('user_goals')
        .update(validationResult.data)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Nutrition goals updated",
      });
      setShowNutritionGoalsDialog(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update goals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHeight = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ 
          height: profile.height,
          units_preference: profile.units_preference 
        })
        .eq('id', user.id);

      if (error) throw error;

      setShowEditHeight(false);
      toast({
        title: "Success!",
        description: "Height updated successfully",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update height",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGender = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ gender: profile.gender })
        .eq('id', user.id);

      if (error) throw error;

      setShowEditGender(false);
      toast({
        title: "Success!",
        description: "Gender updated successfully",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update gender",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveActivity = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ activity_level: profile.activity_level })
        .eq('id', user.id);

      if (error) throw error;

      setShowEditActivity(false);
      toast({
        title: "Success!",
        description: "Activity level updated successfully",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update activity level",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWeightGoals = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_goals')
        .update({
          current_weight: goals.current_weight,
          goal_weight: goals.goal_weight,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Weight goals updated",
      });
      setShowWeightGoalsDialog(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update goals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('delete-account', {
        method: 'POST',
      });
      
      if (error) throw error;

      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted",
      });

      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
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

  const handleRemoveAvatar = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ profile_picture_url: null })
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, profile_picture_url: null });
      toast({
        title: "Success!",
        description: "Profile picture removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove picture",
        variant: "destructive",
      });
    }
  };

  const preGeneratedAvatars = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Bailey',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  ];

  const handleSelectAvatar = async (avatarUrl: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ profile_picture_url: avatarUrl })
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, profile_picture_url: avatarUrl });
      setShowAvatarOptions(false);
      toast({
        title: "Success!",
        description: "Profile picture updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update picture",
        variant: "destructive",
      });
    }
  };

  const handleSaveName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ username: profile.username })
        .eq('id', user.id);

      if (error) throw error;

      setEditingName(false);
      toast({
        title: "Success!",
        description: "Name updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update name",
        variant: "destructive",
      });
    }
  };

  const handleSaveAge = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ age: profile.age })
        .eq('id', user.id);

      if (error) throw error;

      setEditingAge(false);
      toast({
        title: "Success!",
        description: "Age updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update age",
        variant: "destructive",
      });
    }
  };

  const weightUnit = profile.units_preference === 'imperial' ? 'lbs' : 'kg';
  const heightUnit = profile.units_preference === 'imperial' ? 'inches' : 'cm';

  const getActivityLevelLabel = (level: string | null) => {
    if (!level) return 'Not set';
    const labels: Record<string, string> = {
      sedentary: 'Sedentary',
      lightly_active: 'Lightly Active',
      moderately_active: 'Moderately Active',
      very_active: 'Very Active',
      extra_active: 'Extra Active',
    };
    return labels[level] || level;
  };

  const getGenderLabel = (gender: string | null) => {
    if (!gender) return 'Not set';
    const labels: Record<string, string> = {
      male: 'Male',
      female: 'Female',
      other: 'Other',
      prefer_not_to_say: 'Prefer not to say',
    };
    return labels[gender] || gender;
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="h-10 w-10 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        {/* Profile Card */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 cursor-pointer" onClick={() => setShowAvatarOptions(!showAvatarOptions)}>
                  <AvatarImage src={profile.profile_picture_url || undefined} />
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {profile.username?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full shadow-md"
                  onClick={() => setShowAvatarOptions(!showAvatarOptions)}
                >
                  <Camera className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex-1">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                      className="h-8 text-lg font-semibold"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleSaveName}>Save</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{profile.username || 'User'}</h2>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setEditingName(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                {editingAge ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      value={profile.age || ''}
                      onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || null })}
                      className="h-7 w-20 text-sm"
                      autoFocus
                    />
                    <span className="text-sm text-muted-foreground">years old</span>
                    <Button size="sm" onClick={handleSaveAge} className="h-7">Save</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-muted-foreground">{profile.age ? `${profile.age} years old` : 'Add your age'}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5"
                      onClick={() => setEditingAge(true)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Avatar Options */}
            {showAvatarOptions && (
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Choose avatar</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAvatarOptions(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {preGeneratedAvatars.map((avatarUrl, index) => (
                    <Avatar
                      key={index}
                      className="h-12 w-12 cursor-pointer hover:ring-2 ring-primary transition-all"
                      onClick={() => handleSelectAvatar(avatarUrl)}
                    >
                      <AvatarImage src={avatarUrl} />
                    </Avatar>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPicture}
                  >
                    <Camera className="h-3.5 w-3.5 mr-2" />
                    Upload
                  </Button>
                  {profile.profile_picture_url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleRemoveAvatar}
                    >
                      <X className="h-3.5 w-3.5 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePictureUpload}
                />
              </div>
            )}
          </CardContent>
        </Card>


        {/* Menu Items */}
        <div className="space-y-3">
          <Card 
            className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowPersonalDetailsDialog(true)}
          >
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-medium">Personal details</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowNutritionGoalsDialog(true)}
          >
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-medium">Edit nutrition goals</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowWeightGoalsDialog(true)}
          >
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-medium">Goals & current weight</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/daily-log')}
          >
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-medium">Weight history</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Actions */}
        <div className="space-y-3">
          <Card 
            className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={handleLogout}
          >
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <LogOut className="h-5 w-5 text-foreground" />
                  </div>
                  <span className="font-medium">Log out</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardContent className="py-4">
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="font-medium text-muted-foreground">Delete account</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Personal Details Drawer */}
        <Drawer open={showPersonalDetailsDialog} onOpenChange={setShowPersonalDetailsDialog}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Personal Details</DrawerTitle>
            </DrawerHeader>
            <div className="space-y-0 px-4 pb-6">
              {/* Current Weight Display */}
              <div 
                className="flex items-center justify-between py-4 cursor-pointer hover:bg-muted/50 transition-colors px-2 -mx-2 rounded-md"
                onClick={() => setShowWeightGoalsDialog(true)}
              >
                <span className="text-sm text-muted-foreground">Current weight</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{goals.current_weight || 'Not set'} {weightUnit}</span>
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="h-px bg-border" />

              {/* Height */}
              <div 
                className="flex items-center justify-between py-4 cursor-pointer hover:bg-muted/50 transition-colors px-2 -mx-2 rounded-md"
                onClick={() => setShowEditHeight(true)}
              >
                <span className="text-sm text-muted-foreground">Height</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{profile.height || 'Not set'} {heightUnit}</span>
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="h-px bg-border" />

              {/* Gender */}
              <div 
                className="flex items-center justify-between py-4 cursor-pointer hover:bg-muted/50 transition-colors px-2 -mx-2 rounded-md"
                onClick={() => setShowEditGender(true)}
              >
                <span className="text-sm text-muted-foreground">Gender</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{getGenderLabel(profile.gender)}</span>
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="h-px bg-border" />

              {/* Activity Level */}
              <div 
                className="flex items-center justify-between py-4 cursor-pointer hover:bg-muted/50 transition-colors px-2 -mx-2 rounded-md"
                onClick={() => setShowEditActivity(true)}
              >
                <span className="text-sm text-muted-foreground">Activity level</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{getActivityLevelLabel(profile.activity_level)}</span>
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Edit Height Drawer */}
        <Drawer open={showEditHeight} onOpenChange={setShowEditHeight}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Edit Height</DrawerTitle>
            </DrawerHeader>
            <div className="space-y-6 px-4 pb-6">
              {/* Units Toggle */}
              <div className="flex items-center justify-center gap-4">
                <span className={`text-sm font-medium ${profile.units_preference === 'imperial' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Imperial
                </span>
                <Switch 
                  checked={profile.units_preference === 'metric'}
                  onCheckedChange={(checked) => setProfile({ ...profile, units_preference: checked ? 'metric' : 'imperial' })}
                />
                <span className={`text-sm font-medium ${profile.units_preference === 'metric' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Metric
                </span>
              </div>

              {/* Height Input */}
              <div className="space-y-3">
                <Label className="text-center block">Height</Label>
                <div className="flex items-center justify-center gap-2">
                  <Input
                    type="number"
                    value={profile.height || ''}
                    onChange={(e) => setProfile({ ...profile, height: parseFloat(e.target.value) || null })}
                    placeholder="0"
                    className="text-center text-xl w-32 h-12"
                  />
                  <span className="text-lg font-medium">{heightUnit}</span>
                </div>
              </div>

              {/* Save Button */}
              <Button 
                onClick={handleSaveHeight}
                disabled={loading}
                className="w-full rounded-full h-12"
              >
                Save changes
              </Button>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Edit Gender Drawer */}
        <Drawer open={showEditGender} onOpenChange={setShowEditGender}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Edit Gender</DrawerTitle>
            </DrawerHeader>
            <div className="space-y-6 px-4 pb-6">
              <div className="space-y-3">
                <Label>Gender</Label>
                <Select
                  value={profile.gender || ''}
                  onValueChange={(value) => setProfile({ ...profile, gender: value })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleSaveGender}
                disabled={loading}
                className="w-full rounded-full h-12"
              >
                Save changes
              </Button>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Edit Activity Level Drawer */}
        <Drawer open={showEditActivity} onOpenChange={setShowEditActivity}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Edit Activity Level</DrawerTitle>
            </DrawerHeader>
            <div className="space-y-6 px-4 pb-6">
              <div className="space-y-3">
                <Label>Activity Level</Label>
                <Select
                  value={profile.activity_level || ''}
                  onValueChange={(value) => setProfile({ ...profile, activity_level: value })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select activity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentary</SelectItem>
                    <SelectItem value="lightly_active">Lightly Active</SelectItem>
                    <SelectItem value="moderately_active">Moderately Active</SelectItem>
                    <SelectItem value="very_active">Very Active</SelectItem>
                    <SelectItem value="extra_active">Extra Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleSaveActivity}
                disabled={loading}
                className="w-full rounded-full h-12"
              >
                Save changes
              </Button>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Nutrition Goals Drawer */}
        <Drawer open={showNutritionGoalsDialog} onOpenChange={setShowNutritionGoalsDialog}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Edit Nutrition Goals</DrawerTitle>
              <DrawerDescription>Set your daily macro and calorie targets</DrawerDescription>
            </DrawerHeader>
            <div className="space-y-4 px-4 pb-6">
              <div className="space-y-2">
                <Label htmlFor="calories">Daily Calories</Label>
                <Input
                  id="calories"
                  type="number"
                  value={goals.daily_calories}
                  onChange={(e) => setGoals({ ...goals, daily_calories: parseInt(e.target.value) })}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protein">Daily Protein (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  value={goals.daily_protein}
                  onChange={(e) => setGoals({ ...goals, daily_protein: parseInt(e.target.value) })}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs">Daily Carbs (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  value={goals.daily_carbs}
                  onChange={(e) => setGoals({ ...goals, daily_carbs: parseInt(e.target.value) })}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fat">Daily Fat (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  value={goals.daily_fat}
                  onChange={(e) => setGoals({ ...goals, daily_fat: parseInt(e.target.value) })}
                  className="h-12"
                />
              </div>
              <Button 
                onClick={handleSaveGoals} 
                disabled={loading}
                className="w-full rounded-full h-12"
              >
                Save changes
              </Button>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Weight Goals Drawer */}
        <Drawer open={showWeightGoalsDialog} onOpenChange={setShowWeightGoalsDialog}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Weight Goals</DrawerTitle>
              <DrawerDescription>Track your weight progress</DrawerDescription>
            </DrawerHeader>
            <div className="space-y-4 px-4 pb-6">
              <div className="space-y-2">
                <Label htmlFor="current-weight">Current Weight ({weightUnit})</Label>
                <Input
                  id="current-weight"
                  type="number"
                  value={goals.current_weight || ''}
                  onChange={(e) => setGoals({ ...goals, current_weight: parseFloat(e.target.value) })}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-weight">Goal Weight ({weightUnit})</Label>
                <Input
                  id="goal-weight"
                  type="number"
                  value={goals.goal_weight || ''}
                  onChange={(e) => setGoals({ ...goals, goal_weight: parseFloat(e.target.value) })}
                  className="h-12"
                />
              </div>
              <WeightHistoryChart unitsPreference={profile.units_preference} />
              <HealthMetrics
                age={profile.age}
                gender={profile.gender}
                height={profile.height}
                currentWeight={goals.current_weight}
                activityLevel={profile.activity_level}
                unitsPreference={profile.units_preference}
              />
              <Button 
                onClick={handleSaveWeightGoals} 
                disabled={loading}
                className="w-full rounded-full h-12"
              >
                Save changes
              </Button>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Delete Account Confirmation Drawer */}
        <Drawer open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Are you absolutely sure?</DrawerTitle>
              <DrawerDescription>
                This action cannot be undone. This will permanently delete your account
                and remove all your data from our servers.
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="px-4 pb-6">
              <Button
                onClick={handleDeleteAccount}
                disabled={deleting}
                variant="destructive"
                className="w-full rounded-full h-12"
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" className="w-full rounded-full h-12">
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
