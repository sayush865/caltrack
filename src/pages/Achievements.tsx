import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Lock } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "streak" | "logging" | "goals" | "hydration";
}

const ACHIEVEMENTS: Achievement[] = [
  // Streak achievements
  { id: "streak_3", name: "Getting Started", description: "Log food for 3 days in a row", icon: "🔥", category: "streak" },
  { id: "streak_7", name: "Week Warrior", description: "Maintain a 7-day streak", icon: "⚡", category: "streak" },
  { id: "streak_14", name: "Two Week Titan", description: "Maintain a 14-day streak", icon: "💪", category: "streak" },
  { id: "streak_30", name: "Monthly Master", description: "Maintain a 30-day streak", icon: "🏆", category: "streak" },
  { id: "streak_60", name: "Unstoppable", description: "Maintain a 60-day streak", icon: "👑", category: "streak" },
  { id: "streak_100", name: "Century Club", description: "Maintain a 100-day streak", icon: "💯", category: "streak" },
  
  // Logging achievements
  { id: "first_meal", name: "First Bite", description: "Log your first meal", icon: "🍽️", category: "logging" },
  { id: "meals_10", name: "Getting Hungry", description: "Log 10 meals", icon: "🥗", category: "logging" },
  { id: "meals_50", name: "Meal Prep Pro", description: "Log 50 meals", icon: "🍳", category: "logging" },
  { id: "meals_100", name: "Nutrition Ninja", description: "Log 100 meals", icon: "🥷", category: "logging" },
  { id: "meals_500", name: "Food Legend", description: "Log 500 meals", icon: "🌟", category: "logging" },
  
  // Goal achievements
  { id: "goal_hit_1", name: "On Target", description: "Hit your calorie goal for the first time", icon: "🎯", category: "goals" },
  { id: "goal_hit_5", name: "Consistent", description: "Hit your calorie goal 5 times", icon: "✨", category: "goals" },
  { id: "protein_goal_7", name: "Protein Power", description: "Hit protein goal 7 days in a row", icon: "💪", category: "goals" },
  { id: "perfect_week", name: "Perfect Week", description: "Hit all macro goals for 7 days", icon: "🌈", category: "goals" },
  
  // Hydration achievements
  { id: "water_goal_1", name: "Stay Hydrated", description: "Hit your water goal for the first time", icon: "💧", category: "hydration" },
  { id: "water_goal_7", name: "Hydration Hero", description: "Hit water goal 7 days in a row", icon: "🌊", category: "hydration" },
  { id: "water_goal_30", name: "Aqua Master", description: "Hit water goal 30 days", icon: "🐳", category: "hydration" },
];

const Achievements = () => {
  const [earnedAchievements, setEarnedAchievements] = useState<string[]>([]);
  const [earnedDates, setEarnedDates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
    checkAndAwardAchievements();
  }, []);

  const fetchAchievements = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_achievements")
      .select("achievement_id, earned_at")
      .eq("user_id", user.id);

    if (data) {
      setEarnedAchievements(data.map(a => a.achievement_id));
      const dates: Record<string, string> = {};
      data.forEach(a => {
        dates[a.achievement_id] = a.earned_at;
      });
      setEarnedDates(dates);
    }
    setLoading(false);
  };

  const checkAndAwardAchievements = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user stats
    const [streakData, foodLogsCount, waterLogsData] = await Promise.all([
      supabase.from("user_streaks").select("*").eq("user_id", user.id).single(),
      supabase.from("food_logs").select("id", { count: "exact" }).eq("user_id", user.id).eq("status", 1),
      supabase.from("water_logs").select("id", { count: "exact" }).eq("user_id", user.id),
    ]);

    const streak = streakData.data?.current_streak || 0;
    const longestStreak = streakData.data?.longest_streak || 0;
    const mealsLogged = foodLogsCount.count || 0;

    const achievementsToAward: string[] = [];

    // Check streak achievements
    if (longestStreak >= 3) achievementsToAward.push("streak_3");
    if (longestStreak >= 7) achievementsToAward.push("streak_7");
    if (longestStreak >= 14) achievementsToAward.push("streak_14");
    if (longestStreak >= 30) achievementsToAward.push("streak_30");
    if (longestStreak >= 60) achievementsToAward.push("streak_60");
    if (longestStreak >= 100) achievementsToAward.push("streak_100");

    // Check logging achievements
    if (mealsLogged >= 1) achievementsToAward.push("first_meal");
    if (mealsLogged >= 10) achievementsToAward.push("meals_10");
    if (mealsLogged >= 50) achievementsToAward.push("meals_50");
    if (mealsLogged >= 100) achievementsToAward.push("meals_100");
    if (mealsLogged >= 500) achievementsToAward.push("meals_500");

    // Award new achievements
    for (const achievementId of achievementsToAward) {
      await supabase
        .from("user_achievements")
        .upsert({ 
          user_id: user.id, 
          achievement_id: achievementId 
        }, { 
          onConflict: "user_id,achievement_id" 
        });
    }

    // Refresh achievements
    fetchAchievements();
  };

  const categories = [
    { id: "streak", name: "Streak", icon: "🔥" },
    { id: "logging", name: "Logging", icon: "📝" },
    { id: "goals", name: "Goals", icon: "🎯" },
    { id: "hydration", name: "Hydration", icon: "💧" },
  ];

  const earnedCount = earnedAchievements.length;
  const totalCount = ACHIEVEMENTS.length;
  const progressPercent = Math.round((earnedCount / totalCount) * 100);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Achievements</h1>
          <p className="text-muted-foreground text-sm">
            {earnedCount} of {totalCount} unlocked
          </p>
          {/* Progress bar */}
          <div className="w-full bg-secondary rounded-full h-2 mt-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          categories.map(category => (
            <div key={category.id} className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>{category.icon}</span>
                {category.name}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {ACHIEVEMENTS.filter(a => a.category === category.id).map(achievement => {
                  const isEarned = earnedAchievements.includes(achievement.id);
                  return (
                    <Card 
                      key={achievement.id}
                      className={`transition-all ${
                        isEarned 
                          ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30" 
                          : "bg-card/30 opacity-60"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`text-2xl ${!isEarned && "grayscale opacity-50"}`}>
                            {isEarned ? achievement.icon : <Lock className="w-6 h-6 text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm truncate ${!isEarned && "text-muted-foreground"}`}>
                              {achievement.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {achievement.description}
                            </p>
                            {isEarned && earnedDates[achievement.id] && (
                              <p className="text-xs text-primary mt-1">
                                {format(new Date(earnedDates[achievement.id]), "MMM d, yyyy")}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Achievements;
