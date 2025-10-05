import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Pencil } from 'lucide-react';
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
    status?: number;
  };
}

export default function FoodLogItem({ log }: FoodLogItemProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imgKey, setImgKey] = useState(0);
  const [showUndo, setShowUndo] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Prioritize actual captured image (from camera) over predefined food images
  const shouldUseFallback = retryCount >= 2;
  const foodImage = shouldUseFallback 
    ? getFoodImage('generic')
    : (log.image_url && log.image_url.startsWith('http')
      ? log.image_url 
      : getFoodImage(log.food_name));
  
  const handleImageError = () => {
    if (retryCount < 2) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setImgKey(prev => prev + 1);
      }, 1000);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('food_logs')
        .update({ 
          status: 0, 
          deleted_at: new Date().toISOString() 
        })
        .eq('id', log.id);

      if (error) throw error;

      toast({
        title: 'Meal removed',
        description: `${log.food_name} has been removed from your log.`,
      });
      
      // Show undo toast
      setShowUndo(true);
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

  const handleUndo = async () => {
    try {
      const { error } = await supabase
        .from('food_logs')
        .update({ 
          status: 1, 
          deleted_at: null 
        })
        .eq('id', log.id);

      if (error) throw error;

      toast({
        title: 'Meal restored',
        description: `${log.food_name} has been restored to your log.`,
      });
      setShowUndo(false);
    } catch (error: any) {
      toast({
        title: 'Restore failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Auto-hide undo after 5 seconds
  useEffect(() => {
    if (showUndo) {
      const timer = setTimeout(() => {
        setShowUndo(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showUndo]);

  // Don't render if deleted and undo window has passed
  if (log.status === 0 && !showUndo) {
    return null;
  }

  return (
    <>
      {showUndo ? (
        <Card className="overflow-hidden border-2 border-primary bg-primary/10">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">"{log.food_name}" removed</span>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleUndo}
              className="h-8"
            >
              Undo
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden hover:shadow-md transition-shadow border border-border bg-card">
          <div className="flex gap-3 p-3">
            <img 
              key={imgKey}
              src={foodImage} 
              alt={log.food_name}
              onError={handleImageError}
              onClick={() => setShowImageDialog(true)}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover flex-shrink-0 border border-border cursor-pointer hover:opacity-80 transition-opacity"
            />
            
            <CardContent className="flex-1 p-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <h3 className="font-semibold text-sm line-clamp-1">
                    {log.food_name}
                  </h3>
                  <Badge variant="secondary" className="text-xs font-normal w-fit">
                    {format(new Date(log.logged_at), 'MMM d, h:mm a')}
                  </Badge>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/edit-food/${log.id}`)}
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDeleteDialog(true)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
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
      )}

      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-3xl">
          <img 
            key={imgKey}
            src={foodImage} 
            alt={log.food_name}
            onError={handleImageError}
            className="w-full h-auto rounded-lg"
          />
        </DialogContent>
      </Dialog>

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