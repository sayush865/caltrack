import { useRef, useState } from 'react';
import { Camera, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  disabled?: boolean;
}

export default function CameraCapture({ onCapture, disabled }: CameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreview(result);
      onCapture(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card className="p-6 bg-card border-border/50 shadow-sm">
      <div className="space-y-4">
        {preview ? (
          <div className="space-y-4">
            <img 
              src={preview} 
              alt="Food preview" 
              className="w-full rounded-lg object-cover max-h-64"
            />
            <Button
              onClick={() => {
                setPreview(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                if (cameraInputRef.current) cameraInputRef.current.value = '';
              }}
              variant="outline"
              className="w-full"
            >
              Take Another Photo
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Camera className="w-12 h-12" />
              <p className="text-sm">Take or upload a photo of your food</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => cameraInputRef.current?.click()}
                disabled={disabled}
                className="w-full"
                variant="default"
              >
                <Camera className="w-4 h-4 mr-2" />
                Camera
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                variant="secondary"
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}
      </div>
    </Card>
  );
}