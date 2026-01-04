import { useState, useEffect } from "react";
import { Trophy, Target, Droplets, Flame, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, format } from "date-fns";

interface Challenge {
  id: string;
  challenge_type: string;
  target: number;
  progress: number;
  completed: boolean;
}

const CHALLENGE_CONFIG: Record<string, { label: string; icon: typeof Trophy; unit: string }> = {
  log_meals: { label: "Log Meals", icon: Target, unit: "meals" },
  hit_calories: { label: "Hit Calorie Goal", icon: Flame, unit: "days" },
  drink_water: { label: "Hydration Goal", icon: Droplets, unit: "days" },
  streak_days: { label: "Maintain Streak", icon: Flame, unit: "days" },
};

export function WeeklyChallengeCard() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrCreateChallenge();
  }, []);

  const fetchOrCreateChallenge = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekStartStr = format(weekStart, "yyyy-MM-dd");

      // Try to fetch existing challenge
      const { data: existing } = await supabase
        .from("weekly_challenges")
        .select("*")
        .eq("user_id", user.id)
        .eq("week_start", weekStartStr)
        .single();

      if (existing) {
        setChallenge(existing);
      } else {
        // Create new challenge for this week
        const challengeTypes = ["log_meals", "hit_calories", "drink_water"];
        const randomType = challengeTypes[Math.floor(Math.random() * challengeTypes.length)];
        const targets: Record<string, number> = {
          log_meals: 21, // 3 meals x 7 days
          hit_calories: 5, // 5 days hitting calorie goal
          drink_water: 5, // 5 days hitting water goal
        };

        const { data: newChallenge, error } = await supabase
          .from("weekly_challenges")
          .insert({
            user_id: user.id,
            challenge_type: randomType,
            target: targets[randomType],
            week_start: weekStartStr,
          })
          .select()
          .single();

        if (!error && newChallenge) {
          setChallenge(newChallenge);
        }
      }
    } catch (error) {
      console.error("Error fetching challenge:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !challenge) {
    return null;
  }

  const config = CHALLENGE_CONFIG[challenge.challenge_type] || CHALLENGE_CONFIG.log_meals;
  const Icon = config.icon;
  const progressPercent = Math.min((challenge.progress / challenge.target) * 100, 100);

  return (
    <Card className={`border-0 shadow-sm ${challenge.completed ? "bg-primary/5 border-primary/20" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
            challenge.completed ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}>
            {challenge.completed ? (
              <Check className="h-5 w-5" />
            ) : (
              <Icon className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Weekly Challenge
              </span>
              {challenge.completed && (
                <Trophy className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
            <p className="font-semibold mt-0.5">
              {config.label}: {challenge.target} {config.unit}
            </p>
            <div className="mt-2 space-y-1">
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {challenge.progress} / {challenge.target} {config.unit}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
