import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Search, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// Import all food images
import appleImg from '@/assets/food/apple.png';
import bananaImg from '@/assets/food/banana.png';
import orangeImg from '@/assets/food/orange.png';
import strawberryImg from '@/assets/food/strawberry.png';
import blueberryImg from '@/assets/food/blueberry.png';
import broccoliImg from '@/assets/food/broccoli.png';
import carrotImg from '@/assets/food/carrot.png';
import spinachImg from '@/assets/food/spinach.png';
import tomatoImg from '@/assets/food/tomato.png';
import cucumberImg from '@/assets/food/cucumber.png';
import chickenImg from '@/assets/food/chicken.png';
import salmonImg from '@/assets/food/salmon.png';
import eggsImg from '@/assets/food/eggs.png';
import yogurtImg from '@/assets/food/yogurt.png';
import tofuImg from '@/assets/food/tofu.png';
import riceImg from '@/assets/food/rice.png';
import quinoaImg from '@/assets/food/quinoa.png';
import oatsImg from '@/assets/food/oats.png';
import breadImg from '@/assets/food/bread.png';
import pastaImg from '@/assets/food/pasta.png';
import almondsImg from '@/assets/food/almonds.png';
import walnutsImg from '@/assets/food/walnuts.png';
import chiaImg from '@/assets/food/chia.png';
import peanutButterImg from '@/assets/food/peanut-butter.png';
import milkImg from '@/assets/food/milk.png';
import cheeseImg from '@/assets/food/cheese.png';

const imageMap: Record<string, string> = {
  'Apple': appleImg,
  'Banana': bananaImg,
  'Orange': orangeImg,
  'Strawberry': strawberryImg,
  'Blueberry': blueberryImg,
  'Broccoli': broccoliImg,
  'Carrot': carrotImg,
  'Spinach': spinachImg,
  'Tomato': tomatoImg,
  'Cucumber': cucumberImg,
  'Chicken Breast': chickenImg,
  'Salmon': salmonImg,
  'Eggs': eggsImg,
  'Greek Yogurt': yogurtImg,
  'Tofu': tofuImg,
  'Brown Rice': riceImg,
  'Quinoa': quinoaImg,
  'Oats': oatsImg,
  'Whole Wheat Bread': breadImg,
  'Pasta': pastaImg,
  'Almonds': almondsImg,
  'Walnuts': walnutsImg,
  'Chia Seeds': chiaImg,
  'Peanut Butter': peanutButterImg,
  'Milk': milkImg,
  'Cheddar Cheese': cheeseImg,
};

interface FoodItem {
  id: string;
  name: string;
  category: string;
  serving_size: string;
  serving_unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  vitamin_a: number;
  vitamin_c: number;
  calcium: number;
  iron: number;
  image_url: string | null;
}

export default function FoodDatabase() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<FoodItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  const categories = ['All', 'Fruits', 'Vegetables', 'Proteins', 'Grains', 'Nuts', 'Seeds', 'Dairy'];

  useEffect(() => {
    fetchFoodItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [searchQuery, selectedCategory, foodItems]);

  const fetchFoodItems = async () => {
    try {
      const { data, error } = await supabase
        .from('food_database')
        .select('*')
        .order('name');

      if (error) throw error;
      setFoodItems(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load food database',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = foodItems;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  };

  const handleAddToLog = async (item: FoodItem) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to log meals',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      const { error } = await supabase
        .from('food_logs')
        .insert({
          user_id: session.user.id,
          food_name: item.name,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber,
          sugar: item.sugar,
          sodium: item.sodium,
          vitamin_a: item.vitamin_a,
          vitamin_c: item.vitamin_c,
          calcium: item.calcium,
          iron: item.iron,
          logged_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: `${item.name} added to your log`,
      });

      navigate('/daily-log');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add food to log',
        variant: 'destructive',
      });
    }
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
            <h1 className="text-3xl font-bold">Food Database</h1>
            <p className="text-sm text-muted-foreground">
              Browse and select from our nutrition database
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search foods..."
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

        {/* Food Items */}
        <div className="space-y-3">
          {loading ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Loading...</p>
            </Card>
          ) : filteredItems.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No items found</p>
            </Card>
          ) : (
            filteredItems.map((item) => (
              <Card key={item.id} className="p-4 hover:bg-accent transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4 flex-1">
                    {imageMap[item.name] && (
                      <img 
                        src={imageMap[item.name]} 
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{item.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Per {item.serving_size}{item.serving_unit}
                      </p>
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Calories</p>
                          <p className="font-medium">{item.calories}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Protein</p>
                          <p className="font-medium">{item.protein}g</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Carbs</p>
                          <p className="font-medium">{item.carbs}g</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Fat</p>
                          <p className="font-medium">{item.fat}g</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    onClick={() => handleAddToLog(item)}
                    className="shrink-0"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
