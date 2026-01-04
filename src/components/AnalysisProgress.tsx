import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, Brain, Sparkles, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalysisProgressProps {
  isAnalyzing: boolean;
  imagePreview?: string | null;
  analysisType?: 'image' | 'text';
}

const imageStages = [
  { id: 'upload', label: 'Processing image', sublabel: 'Optimizing for analysis', icon: Upload, duration: 600 },
  { id: 'analyze', label: 'Identifying food items', sublabel: 'AI vision analyzing your meal', icon: Brain, duration: 8000 },
  { id: 'process', label: 'Calculating nutrition', sublabel: 'Estimating portions & macros', icon: Sparkles, duration: 3000 },
];

const textStages = [
  { id: 'parse', label: 'Parsing description', sublabel: 'Understanding your meal', icon: Upload, duration: 400 },
  { id: 'analyze', label: 'Analyzing ingredients', sublabel: 'AI identifying food components', icon: Brain, duration: 6000 },
  { id: 'process', label: 'Calculating nutrition', sublabel: 'Estimating portions & macros', icon: Sparkles, duration: 2000 },
];

export default function AnalysisProgress({ isAnalyzing, imagePreview, analysisType = 'image' }: AnalysisProgressProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const stages = analysisType === 'image' ? imageStages : textStages;

  useEffect(() => {
    if (!isAnalyzing) {
      setCurrentStage(0);
      setProgress(0);
      setElapsedTime(0);
      return;
    }

    const startTime = Date.now();
    let stageTimeout: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;
    let timerInterval: NodeJS.Timeout;

    // Update elapsed time every second
    timerInterval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    const advanceStage = (stage: number) => {
      if (stage >= stages.length) return;
      
      setCurrentStage(stage);
      const stageProgress = (stage / stages.length) * 100;
      const nextStageProgress = ((stage + 1) / stages.length) * 100;
      
      let currentProgress = stageProgress;
      progressInterval = setInterval(() => {
        currentProgress += 0.3;
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
      clearInterval(timerInterval);
    };
  }, [isAnalyzing, stages]);

  if (!isAnalyzing) return null;

  return (
    <Card className="border border-border bg-card overflow-hidden">
      <div className="p-6 space-y-6">
        {/* Header with image preview */}
        <div className="flex gap-4 items-start">
          {imagePreview && analysisType === 'image' && (
            <div className="w-20 h-20 rounded-lg overflow-hidden border border-border shrink-0 bg-muted">
              <img 
                src={imagePreview} 
                alt="Food being analyzed" 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <h2 className="text-lg font-semibold">Analyzing Your {analysisType === 'image' ? 'Photo' : 'Meal'}</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {stages[currentStage]?.sublabel || 'Processing...'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {elapsedTime}s elapsed
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {Math.round(progress)}%
          </p>
        </div>

        {/* Stage indicators */}
        <div className="space-y-2">
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
                  isComplete && 'opacity-50'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0',
                    isActive && 'bg-primary text-primary-foreground',
                    isComplete && 'bg-primary/20 text-primary',
                    !isActive && !isComplete && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isComplete ? (
                    <Check className="w-4 h-4" />
                  ) : isActive ? (
                    <Icon className="w-4 h-4 animate-pulse" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium transition-colors truncate',
                      isActive && 'text-foreground',
                      !isActive && 'text-muted-foreground'
                    )}
                  >
                    {stage.label}
                  </p>
                </div>
                {isActive && (
                  <div className="flex gap-1 shrink-0">
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
