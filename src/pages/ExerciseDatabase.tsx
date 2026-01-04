import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Search, Plus, Clock, Flame } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface ExerciseItem {
  id: string;
  name: string;
  category: string;
  met_value: number;
  description: string | null;
  icon: string | null;
}

interface UserGoals {
  current_weight: number | null;
}

export default function ExerciseDatabase() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ExerciseItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [userWeight, setUserWeight] = useState<number>(70); // Default 70kg
  
  // Dialog state for logging exercise
  const [selectedExercise, setSelectedExercise] = useState<ExerciseItem | null>(null);
  const [duration, setDuration] = useState('30');
  const [isLogging, setIsLogging] = useState(false);

  const categories = ['All', 'Cardio', 'Strength', 'Sports', 'Flexibility'];

  useEffect(() => {
    fetchExercises();
    fetchUserWeight();
  }, []);

  useEffect(() => {
    filterItems();
  }, [searchQuery, selectedCategory, exercises]);

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercise_database')
        .select('*')
        .order('name');

      if (error) throw error;
      setExercises(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load exercise database',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserWeight = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_goals')
        .select('current_weight')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.current_weight) {
        // Convert lbs to kg if stored in lbs (assuming imperial default)
        const weightKg = data.current_weight * 0.453592;
        setUserWeight(weightKg);
      }
    } catch (error) {
      console.error('Error fetching user weight:', error);
    }
  };

  const filterItems = () => {
    let filtered = exercises;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => 
        item.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  };

  const calculateCalories = (metValue: number, durationMinutes: number): number => {
    // Calories = MET × weight(kg) × duration(hours)
    const durationHours = durationMinutes / 60;
    return Math.round(metValue * userWeight * durationHours);
  };

  const handleSelectExercise = (exercise: ExerciseItem) => {
    setSelectedExercise(exercise);
    setDuration('30');
  };

  const handleLogExercise = async () => {
    if (!selectedExercise) return;
    
    setIsLogging(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to log exercises',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      const durationMinutes = parseInt(duration) || 30;
      const caloriesBurned = calculateCalories(selectedExercise.met_value, durationMinutes);

      const { error } = await supabase
        .from('exercise_logs')
        .insert({
          user_id: session.user.id,
          exercise_name: selectedExercise.name,
          exercise_type: selectedExercise.category,
          duration_minutes: durationMinutes,
          calories_burned: caloriesBurned,
          intensity: getIntensityFromMet(selectedExercise.met_value),
          logged_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Exercise Logged!',
        description: `${selectedExercise.name} - ${durationMinutes} min, ${caloriesBurned} cal burned`,
      });

      setSelectedExercise(null);
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to log exercise',
        variant: 'destructive',
      });
    } finally {
      setIsLogging(false);
    }
  };

  const getIntensityFromMet = (met: number): string => {
    if (met < 4) return 'low';
    if (met < 7) return 'moderate';
    if (met < 10) return 'high';
    return 'very_high';
  };

  const getIntensityColor = (met: number): string => {
    if (met < 4) return 'bg-green-500/10 text-green-600 dark:text-green-400';
    if (met < 7) return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    if (met < 10) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
    return 'bg-red-500/10 text-red-600 dark:text-red-400';
  };

  const getIntensityLabel = (met: number): string => {
    if (met < 4) return 'Low';
    if (met < 7) return 'Moderate';
    if (met < 10) return 'High';
    return 'Very High';
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
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
            <h1 className="text-3xl font-bold">Exercise Database</h1>
            <p className="text-sm text-muted-foreground">
              Browse and log your workouts
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Categories */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category}>
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Exercise Items */}
        <div className="space-y-3">
          {loading ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Loading...</p>
            </Card>
          ) : filteredItems.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No exercises found</p>
            </Card>
          ) : (
            filteredItems.map((exercise) => {
              const estimatedCalories = calculateCalories(exercise.met_value, 30);
              
              return (
                <Card key={exercise.id} className="p-4 hover:bg-accent transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="w-12 h-12 flex items-center justify-center text-3xl bg-muted rounded-lg shrink-0">
                        {exercise.icon || '🏃'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{exercise.name}</h3>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getIntensityColor(exercise.met_value)}`}
                          >
                            {getIntensityLabel(exercise.met_value)}
                          </Badge>
                        </div>
                        {exercise.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {exercise.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Flame className="w-4 h-4" />
                            ~{estimatedCalories} cal/30min
                          </span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {exercise.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      onClick={() => handleSelectExercise(exercise)}
                      className="shrink-0"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Log Exercise Dialog */}
      <Dialog open={!!selectedExercise} onOpenChange={() => setSelectedExercise(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedExercise?.icon || '🏃'}</span>
              {selectedExercise?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="1"
                max="480"
              />
            </div>
            
            {selectedExercise && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estimated calories burned</span>
                  <span className="text-xl font-bold flex items-center gap-1">
                    <Flame className="w-5 h-5 text-orange-500" />
                    {calculateCalories(selectedExercise.met_value, parseInt(duration) || 0)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on your weight and exercise intensity
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedExercise(null)}>
              Cancel
            </Button>
            <Button onClick={handleLogExercise} disabled={isLogging}>
              {isLogging ? 'Logging...' : 'Log Exercise'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
