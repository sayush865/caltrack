import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, Brain, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalysisProgressProps {
  isAnalyzing: boolean;
}

const stages = [
  { id: 'upload', label: 'Uploading image', icon: Upload, duration: 1500 },
  { id: 'analyze', label: 'AI analyzing food', icon: Brain, duration: 6000 },
  { id: 'process', label: 'Processing nutrition', icon: Sparkles, duration: 2000 },
];

export default function AnalysisProgress({ isAnalyzing }: AnalysisProgressProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isAnalyzing) {
      setCurrentStage(0);
      setProgress(0);
      return;
    }

    let stageTimeout: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;

    const advanceStage = (stage: number) => {
      if (stage >= stages.length) return;
      
      setCurrentStage(stage);
      const stageProgress = (stage / stages.length) * 100;
      const nextStageProgress = ((stage + 1) / stages.length) * 100;
      
      let currentProgress = stageProgress;
      progressInterval = setInterval(() => {
        currentProgress += 0.5;
        if (currentProgress >= nextStageProgress - 5) {
          clearInterval(progressInterval);
        }
        setProgress(Math.min(currentProgress, 95));
      }, 50);

      stageTimeout = setTimeout(() => {
        clearInterval(progressInterval);
        advanceStage(stage + 1);
      }, stages[stage].duration);
    };

    advanceStage(0);

    return () => {
      clearTimeout(stageTimeout);
      clearInterval(progressInterval);
    };
  }, [isAnalyzing]);

  if (!isAnalyzing) return null;

  return (
    <Card className="border border-border bg-card p-8">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Analyzing Your Food</h2>
          <p className="text-sm text-muted-foreground">
            Our AI is identifying ingredients and calculating nutrition
          </p>
        </div>

        <Progress value={progress} className="h-2" />

        <div className="space-y-3">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = index === currentStage;
            const isComplete = index < currentStage;

            return (
              <div
                key={stage.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-all duration-300',
                  isActive && 'bg-primary/10',
                  isComplete && 'opacity-60'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                    isActive && 'bg-primary text-primary-foreground animate-pulse',
                    isComplete && 'bg-primary/20 text-primary',
                    !isActive && !isComplete && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isComplete ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={cn(
                      'font-medium transition-colors',
                      isActive && 'text-foreground',
                      !isActive && 'text-muted-foreground'
                    )}
                  >
                    {stage.label}
                  </p>
                </div>
                {isActive && (
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
