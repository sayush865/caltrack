import { useState } from "react";
import { Heart, HeartOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SaveAsTemplateButtonProps {
  food: {
    food_name: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    vitamin_a?: number;
    vitamin_c?: number;
    calcium?: number;
    iron?: number;
    meal_type?: string;
    image_url?: string;
  };
  isFavorite?: boolean;
  templateId?: string;
  onToggle?: (isFavorite: boolean, templateId?: string) => void;
  variant?: "icon" | "button";
}

export function SaveAsTemplateButton({
  food,
  isFavorite = false,
  templateId,
  onToggle,
  variant = "icon",
}: SaveAsTemplateButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [favorite, setFavorite] = useState(isFavorite);
  const [currentTemplateId, setCurrentTemplateId] = useState(templateId);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (favorite && currentTemplateId) {
        // Remove from favorites
        const { error } = await supabase
          .from("meal_templates")
          .delete()
          .eq("id", currentTemplateId);

        if (error) throw error;

        setFavorite(false);
        setCurrentTemplateId(undefined);
        onToggle?.(false);
        
        toast({
          title: "Removed from favorites",
          description: food.food_name,
        });
      } else {
        // Add to favorites
        const { data, error } = await supabase
          .from("meal_templates")
          .insert({
            user_id: user.id,
            name: food.food_name,
            food_name: food.food_name,
            calories: food.calories || 0,
            protein: food.protein || 0,
            carbs: food.carbs || 0,
            fat: food.fat || 0,
            fiber: food.fiber || 0,
            sugar: food.sugar || 0,
            sodium: food.sodium || 0,
            vitamin_a: food.vitamin_a || 0,
            vitamin_c: food.vitamin_c || 0,
            calcium: food.calcium || 0,
            iron: food.iron || 0,
            meal_type: food.meal_type || null,
            image_url: food.image_url || null,
          })
          .select("id")
          .single();

        if (error) throw error;

        setFavorite(true);
        setCurrentTemplateId(data.id);
        onToggle?.(true, data.id);
        
        toast({
          title: "Added to favorites",
          description: food.food_name,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update favorites",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleToggle}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : favorite ? (
          <Heart className="h-4 w-4 fill-primary text-primary" />
        ) : (
          <Heart className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={favorite ? "default" : "outline"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : favorite ? (
        <>
          <HeartOff className="h-4 w-4" />
          Remove Favorite
        </>
      ) : (
        <>
          <Heart className="h-4 w-4" />
          Save as Favorite
        </>
      )}
    </Button>
  );
}
