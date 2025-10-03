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
      <Card className="overflow-hidden hover:border-foreground/20 transition-all border border-border bg-card">
        <div className="flex gap-3 sm:gap-4 p-3 sm:p-4">
          <img 
            src={log.image_url} 
            alt={log.food_name}
            className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-lg object-cover flex-shrink-0 border border-border"
          />
          <CardContent className="flex-1 p-0 space-y-1.5 sm:space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base line-clamp-1">{log.food_name}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {format(new Date(log.logged_at), 'MMM d, h:mm a')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </div>
            <div className="flex gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm flex-wrap">
              <div className="whitespace-nowrap">
                <span className="font-bold text-primary">{log.calories}</span>
                <span className="text-muted-foreground text-[10px] sm:text-xs ml-0.5 sm:ml-1">cal</span>
              </div>
              <div className="whitespace-nowrap">
                <span className="font-semibold">{log.protein}g</span>
                <span className="text-muted-foreground text-[10px] sm:text-xs ml-0.5 sm:ml-1">P</span>
              </div>
              <div className="whitespace-nowrap">
                <span className="font-semibold">{log.carbs}g</span>
                <span className="text-muted-foreground text-[10px] sm:text-xs ml-0.5 sm:ml-1">C</span>
              </div>
              <div className="whitespace-nowrap">
                <span className="font-semibold">{log.fat}g</span>
                <span className="text-muted-foreground text-[10px] sm:text-xs ml-0.5 sm:ml-1">F</span>
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