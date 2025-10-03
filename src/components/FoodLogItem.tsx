import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';

interface FoodLogItemProps {
  log: {
    id: string;
    food_name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    image_url: string;
    logged_at: string;
  };
}

export default function FoodLogItem({ log }: FoodLogItemProps) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('food_logs')
        .delete()
        .eq('id', log.id);

      if (error) throw error;

      toast({
        title: 'Meal deleted',
        description: `${log.food_name} has been removed from your log.`,
      });
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 border border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm animate-fade-in">
        <div className="flex gap-3 sm:gap-4 p-3 sm:p-4">
          <div className="relative flex-shrink-0">
            <img 
              src={log.image_url} 
              alt={log.food_name}
              className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-xl object-cover border-2 border-border/50 shadow-md group-hover:scale-105 transition-transform duration-300"
            />
            {/* Image overlay gradient */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          
          <CardContent className="flex-1 p-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm sm:text-base line-clamp-1 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                  {log.food_name}
                </h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  {format(new Date(log.logged_at), 'MMM d, h:mm a')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </div>
            
            <div className="flex gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap">
              <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                <span className="font-bold text-primary">{log.calories}</span>
                <span className="text-muted-foreground text-[10px] sm:text-xs">cal</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 rounded-lg border border-red-500/20">
                <span className="font-semibold text-red-600 dark:text-red-400">{log.protein}g</span>
                <span className="text-muted-foreground text-[10px] sm:text-xs">P</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <span className="font-semibold text-yellow-600 dark:text-yellow-400">{log.carbs}g</span>
                <span className="text-muted-foreground text-[10px] sm:text-xs">C</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <span className="font-semibold text-blue-600 dark:text-blue-400">{log.fat}g</span>
                <span className="text-muted-foreground text-[10px] sm:text-xs">F</span>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete meal?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{log.food_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}