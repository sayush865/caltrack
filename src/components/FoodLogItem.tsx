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
      <Card className="overflow-hidden shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1),0_4px_16px_-4px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12),0_8px_24px_-4px_rgba(0,0,0,0.1)] transition-all border-0">
        <div className="flex gap-4 p-5">
          <img 
            src={log.image_url} 
            alt={log.food_name}
            className="w-24 h-24 object-cover rounded-2xl flex-shrink-0"
          />
          
          <CardContent className="flex-1 p-0 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="font-bold text-base line-clamp-1">
                  {log.food_name}
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  {format(new Date(log.logged_at), 'h:mm a')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                className="h-9 w-9 text-muted-foreground hover:text-destructive flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="text-center p-2.5 bg-secondary rounded-xl">
                <div className="font-bold text-sm">{Math.round(log.calories)}</div>
                <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">cal</div>
              </div>
              <div className="text-center p-2.5 bg-secondary rounded-xl">
                <div className="font-bold text-sm">{Math.round(log.protein)}g</div>
                <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">pro</div>
              </div>
              <div className="text-center p-2.5 bg-secondary rounded-xl">
                <div className="font-bold text-sm">{Math.round(log.carbs)}g</div>
                <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">carb</div>
              </div>
              <div className="text-center p-2.5 bg-secondary rounded-xl">
                <div className="font-bold text-sm">{Math.round(log.fat)}g</div>
                <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">fat</div>
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