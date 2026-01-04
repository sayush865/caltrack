import { useState, useEffect } from "react";
import { Heart, Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

interface MealTemplate {
  id: string;
  name: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  use_count: number;
}

export function MealTemplatesSheet() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("meal_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("use_count", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async (template: MealTemplate) => {
    setAdding(template.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Add food log
      const { error: logError } = await supabase.from("food_logs").insert({
        user_id: user.id,
        food_name: template.food_name,
        calories: template.calories,
        protein: template.protein,
        carbs: template.carbs,
        fat: template.fat,
        fiber: template.fiber,
        logged_at: new Date().toISOString(),
        status: 1,
      });

      if (logError) throw logError;

      // Increment use count
      await supabase
        .from("meal_templates")
        .update({ use_count: template.use_count + 1 })
        .eq("id", template.id);

      toast({
        title: "Added!",
        description: `${template.food_name} (${template.calories} cal)`,
      });

      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add meal",
        variant: "destructive",
      });
    } finally {
      setAdding(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("meal_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast({
        title: "Deleted",
        description: "Favorite removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Heart className="h-4 w-4" />
          Favorites
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Favorite Meals
          </SheetTitle>
          <SheetDescription>
            Quickly add your saved meals with one tap
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3 overflow-y-auto max-h-[calc(70vh-120px)] pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground">No favorites yet</p>
              <p className="text-xs text-muted-foreground">
                Tap the heart icon on any meal to save it here
              </p>
            </div>
          ) : (
            templates.map((template) => (
              <Card key={template.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{template.food_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {template.calories} cal • {template.protein}g protein
                    </p>
                    {template.use_count > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Used {template.use_count} time{template.use_count !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleQuickAdd(template)}
                      disabled={adding === template.id}
                      className="gap-1.5"
                    >
                      {adding === template.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
