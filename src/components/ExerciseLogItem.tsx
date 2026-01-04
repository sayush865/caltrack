import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Clock, Flame, ChevronRight } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ExerciseLog {
  id: string;
  exercise_name: string;
  exercise_type: string;
  duration_minutes: number;
  calories_burned: number;
  intensity: string | null;
  distance_km: number | null;
  sets: number | null;
  reps: number | null;
  notes: string | null;
  logged_at: string;
}

interface ExerciseLogItemProps {
  log: ExerciseLog;
  onDelete?: () => void;
}

const exerciseEmojis: Record<string, string> = {
  cardio: '🏃',
  strength: '💪',
  sports: '⚽',
  flexibility: '🧘',
};

const intensityColors: Record<string, string> = {
  low: 'bg-green-500/10 text-green-600 dark:text-green-400',
  moderate: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  very_high: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

export default function ExerciseLogItem({ log, onDelete }: ExerciseLogItemProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('exercise_logs')
        .update({ status: 0 })
        .eq('id', log.id);

      if (error) throw error;

      toast({
        title: 'Exercise deleted',
        description: `${log.exercise_name} removed from your log`,
      });

      onDelete?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete exercise',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const emoji = exerciseEmojis[log.exercise_type.toLowerCase()] || '🏃';
  const intensityClass = log.intensity ? intensityColors[log.intensity] : '';

  return (
    <Card className="p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 flex items-center justify-center text-2xl bg-muted rounded-lg shrink-0">
          {emoji}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{log.exercise_name}</h3>
            {log.intensity && (
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${intensityClass}`}>
                {log.intensity.replace('_', ' ')}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {log.duration_minutes} min
            </span>
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              {Math.round(log.calories_burned)} cal
            </span>
            {log.distance_km && (
              <span>{log.distance_km} km</span>
            )}
            {log.sets && log.reps && (
              <span>{log.sets} × {log.reps}</span>
            )}
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete exercise?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove {log.exercise_name} from your log. The {Math.round(log.calories_burned)} calories burned will no longer count toward your daily total.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}
