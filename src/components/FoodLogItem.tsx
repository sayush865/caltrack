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
        <div className="flex gap-4 p-4">
          <img 
            src={log.image_url} 
            alt={log.food_name}
            className="w-28 h-28 rounded-lg object-cover flex-shrink-0 border border-border"
          />
          <CardContent className="flex-1 p-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base line-clamp-1">{log.food_name}</h3>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(log.logged_at), 'MMM d, h:mm a')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="font-bold text-primary">{log.calories}</span>
                <span className="text-muted-foreground text-xs ml-1">cal</span>
              </div>
              <div>
                <span className="font-semibold">{log.protein}g</span>
                <span className="text-muted-foreground text-xs ml-1">protein</span>
              </div>
              <div>
                <span className="font-semibold">{log.carbs}g</span>
                <span className="text-muted-foreground text-xs ml-1">carbs</span>
              </div>
              <div>
                <span className="font-semibold">{log.fat}g</span>
                <span className="text-muted-foreground text-xs ml-1">fat</span>
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