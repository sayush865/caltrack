import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { ArrowLeft, Save, Trash2, Camera, Plus } from 'lucide-react';
import { nutritionGoalsSchema, profileSchema } from '@/lib/validation';
import { WeightHistoryChart } from '@/components/WeightHistoryChart';
import { HealthMetrics } from '@/components/HealthMetrics';

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddWeightDialog, setShowAddWeightDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newWeight, setNewWeight] = useState('');
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

      // Fetch profile
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

      // Fetch goals
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
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

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      // Update profile
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
        description: "Your nutrition goals have been updated",
      });
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

  const handleAddWeight = async () => {
    if (!newWeight) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const weightValue = parseFloat(newWeight);
      if (isNaN(weightValue) || weightValue <= 0) {
        throw new Error('Please enter a valid weight');
      }

      // Add to weight logs
      const { error: logError } = await supabase
        .from('weight_logs')
        .insert({ user_id: user.id, weight: weightValue });

      if (logError) throw logError;

      // Update current weight in goals
      const { error: goalError } = await supabase
        .from('user_goals')
        .update({ current_weight: weightValue })
        .eq('user_id', user.id);

      if (goalError) throw goalError;

      setGoals({ ...goals, current_weight: weightValue });
      setNewWeight('');
      setShowAddWeightDialog(false);
      
      toast({
        title: "Success!",
        description: "Weight logged successfully",
      });
      
      // Refresh the chart
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to log weight",
        variant: "destructive",
      });
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
        description: error.message || "Failed to delete account. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const weightUnit = profile.units_preference === 'imperial' ? 'lbs' : 'kg';
  const heightUnit = profile.units_preference === 'imperial' ? 'inches' : 'cm';

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-border pb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="h-11 w-11"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your profile and nutrition goals
            </p>
          </div>
        </div>

        {/* Units Preference */}
        <Card>
          <CardHeader>
            <CardTitle>Units Preference</CardTitle>
            <CardDescription>Choose your preferred measurement system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Metric System</Label>
                <p className="text-sm text-muted-foreground">Use kilograms and centimeters</p>
              </div>
              <Switch
                checked={profile.units_preference === 'metric'}
                onCheckedChange={(checked) => setProfile({ ...profile, units_preference: checked ? 'metric' : 'imperial' })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Profile Picture & Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your account details and profile picture</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.profile_picture_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {profile.username?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPicture}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePictureUpload}
                />
              </div>
              <div className="flex-1 space-y-2">
                <div className="space-y-1">
                  <Label>Username</Label>
                  <Input value={profile.username} disabled className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input value={profile.email} disabled className="bg-muted" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Details */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
            <CardDescription>Help us calculate accurate health metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={profile.age || ''}
                  onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || null })}
                  placeholder="25"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={profile.gender || ''} onValueChange={(value) => setProfile({ ...profile, gender: value })}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label htmlFor="height">Height ({heightUnit})</Label>
                <Input
                  id="height"
                  type="number"
                  value={profile.height || ''}
                  onChange={(e) => setProfile({ ...profile, height: parseFloat(e.target.value) || null })}
                  placeholder={profile.units_preference === 'imperial' ? '70' : '178'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity">Activity Level</Label>
                <Select value={profile.activity_level || ''} onValueChange={(value) => setProfile({ ...profile, activity_level: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentary (little/no exercise)</SelectItem>
                    <SelectItem value="lightly_active">Lightly Active (1-3 days/week)</SelectItem>
                    <SelectItem value="moderately_active">Moderately Active (3-5 days/week)</SelectItem>
                    <SelectItem value="very_active">Very Active (6-7 days/week)</SelectItem>
                    <SelectItem value="extra_active">Extra Active (athlete)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSaveProfile} disabled={loading} className="w-full" size="lg">
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Profile'}
            </Button>
          </CardContent>
        </Card>

        {/* Health Metrics */}
        <HealthMetrics
          age={profile.age}
          gender={profile.gender}
          height={profile.height}
          currentWeight={goals.current_weight}
          activityLevel={profile.activity_level}
          unitsPreference={profile.units_preference}
        />

        {/* Weight Goals & Tracking */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Weight Goals</CardTitle>
                <CardDescription>Track your weight progress</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowAddWeightDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Log Weight
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_weight">Current Weight ({weightUnit})</Label>
                <Input
                  id="current_weight"
                  type="number"
                  value={goals.current_weight || ''}
                  onChange={(e) => setGoals({ ...goals, current_weight: Number(e.target.value) || 0 })}
                  placeholder="150"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal_weight">Goal Weight ({weightUnit})</Label>
                <Input
                  id="goal_weight"
                  type="number"
                  value={goals.goal_weight || ''}
                  onChange={(e) => setGoals({ ...goals, goal_weight: Number(e.target.value) || 0 })}
                  placeholder="140"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weight History Chart */}
        <WeightHistoryChart unitsPreference={profile.units_preference} />

        {/* Nutrition Goals */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Nutrition Goals</CardTitle>
            <CardDescription>Set your daily macro targets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="calories">Calories</Label>
                <Input
                  id="calories"
                  type="number"
                  value={goals.daily_calories}
                  onChange={(e) => setGoals({ ...goals, daily_calories: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protein">Protein (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  value={goals.daily_protein}
                  onChange={(e) => setGoals({ ...goals, daily_protein: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs">Carbs (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  value={goals.daily_carbs}
                  onChange={(e) => setGoals({ ...goals, daily_carbs: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fat">Fat (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  value={goals.daily_fat}
                  onChange={(e) => setGoals({ ...goals, daily_fat: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <Button onClick={handleSaveGoals} disabled={loading} className="w-full" size="lg">
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Goals'}
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Once you delete your account, there is no going back. All your data including food logs, goals, and profile will be permanently deleted.
              </p>
              <Button onClick={() => setShowDeleteDialog(true)} variant="destructive" size="lg" className="w-full">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Add Weight Dialog */}
        <AlertDialog open={showAddWeightDialog} onOpenChange={setShowAddWeightDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Log Weight</AlertDialogTitle>
              <AlertDialogDescription>
                Enter your current weight to track your progress
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="new_weight">Weight ({weightUnit})</Label>
              <Input
                id="new_weight"
                type="number"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="150"
                className="mt-2"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleAddWeight}>Log Weight</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove all your data from our servers including:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>All food logs and nutrition data</li>
                  <li>Your nutrition goals and preferences</li>
                  <li>Your profile information</li>
                  <li>All uploaded food images</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleting ? 'Deleting...' : 'Yes, delete my account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
