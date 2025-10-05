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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Camera, User, Target, Activity, TrendingUp, Scale, AlertTriangle, ChevronRight, Edit } from 'lucide-react';
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
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
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
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile.profile_picture_url || undefined} />
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {profile.username?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full shadow-md"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPicture}
                >
                  <Camera className="h-3.5 w-3.5" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePictureUpload}
                />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold">{profile.username || 'User'}</h2>
                <p className="text-sm text-muted-foreground">{profile.age ? `${profile.age} years old` : 'Add your age'}</p>
              </div>
            </div>
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

        {/* Danger Zone */}
        <Card className="border-destructive/50 shadow-sm">
          <CardContent className="py-4">
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <span className="font-medium text-destructive">Delete account</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>

        {/* Personal Details Dialog */}
        <Dialog open={showPersonalDetailsDialog} onOpenChange={setShowPersonalDetailsDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Personal Details</DialogTitle>
              <DialogDescription>Update your personal information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-sm text-muted-foreground">Current weight</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{goals.current_weight || 'Not set'} {weightUnit}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-sm text-muted-foreground">Height</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={profile.height || ''}
                      onChange={(e) => setProfile({ ...profile, height: parseFloat(e.target.value) || null })}
                      placeholder="0"
                      className="w-24 text-right"
                    />
                    <span className="text-sm font-medium">{heightUnit}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-sm text-muted-foreground">Age</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={profile.age || ''}
                      onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || null })}
                      placeholder="0"
                      className="w-24 text-right"
                    />
                    <span className="text-sm font-medium">years</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-sm text-muted-foreground">Gender</span>
                  <Select value={profile.gender || ''} onValueChange={(value) => setProfile({ ...profile, gender: value })}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-muted-foreground">Activity level</span>
                  <Select value={profile.activity_level || ''} onValueChange={(value) => setProfile({ ...profile, activity_level: value })}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select" />
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
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveProfile} disabled={loading} className="w-full">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Nutrition Goals Dialog */}
        <Dialog open={showNutritionGoalsDialog} onOpenChange={setShowNutritionGoalsDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nutrition Goals</DialogTitle>
              <DialogDescription>Set your daily macro targets</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Calories</Label>
                <Input
                  type="number"
                  value={goals.daily_calories}
                  onChange={(e) => setGoals({ ...goals, daily_calories: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Protein (g)</Label>
                <Input
                  type="number"
                  value={goals.daily_protein}
                  onChange={(e) => setGoals({ ...goals, daily_protein: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Carbs (g)</Label>
                <Input
                  type="number"
                  value={goals.daily_carbs}
                  onChange={(e) => setGoals({ ...goals, daily_carbs: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fat (g)</Label>
                <Input
                  type="number"
                  value={goals.daily_fat}
                  onChange={(e) => setGoals({ ...goals, daily_fat: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveGoals} disabled={loading} className="w-full">
                {loading ? 'Saving...' : 'Save Goals'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Weight Goals Dialog */}
        <Dialog open={showWeightGoalsDialog} onOpenChange={setShowWeightGoalsDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Weight Goals</DialogTitle>
              <DialogDescription>Track your weight progress</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Current Weight ({weightUnit})</Label>
                <Input
                  type="number"
                  value={goals.current_weight || ''}
                  onChange={(e) => setGoals({ ...goals, current_weight: parseFloat(e.target.value) || 0 })}
                  placeholder="150"
                />
              </div>
              <div className="space-y-2">
                <Label>Goal Weight ({weightUnit})</Label>
                <Input
                  type="number"
                  value={goals.goal_weight || ''}
                  onChange={(e) => setGoals({ ...goals, goal_weight: parseFloat(e.target.value) || 0 })}
                  placeholder="140"
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
            </div>
            <DialogFooter>
              <Button onClick={handleSaveWeightGoals} disabled={loading} className="w-full">
                {loading ? 'Saving...' : 'Save Goals'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove all your data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
