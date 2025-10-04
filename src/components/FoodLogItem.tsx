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
import { getFoodImage } from '@/lib/foodImages';

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
  
  // Always get the image from our image map using the food name (includes fallback)
  const foodImage = getFoodImage(log.food_name);

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
      <Card className="overflow-hidden hover:shadow-md transition-shadow border border-border bg-card">
        <div className="flex gap-3 p-3">
          <img 
            src={foodImage} 
            alt={log.food_name}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover flex-shrink-0 border border-border"
          />
          
          <CardContent className="flex-1 p-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm line-clamp-1">
                  {log.food_name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(log.logged_at), 'MMM d, h:mm a')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-1">
                <span className="font-bold">{log.calories}</span>
                <span className="text-muted-foreground">cal</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold">{log.protein}g</span>
                <span className="text-muted-foreground">P</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold">{log.carbs}g</span>
                <span className="text-muted-foreground">C</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold">{log.fat}g</span>
                <span className="text-muted-foreground">F</span>
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