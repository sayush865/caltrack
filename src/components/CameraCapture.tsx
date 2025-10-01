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
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreview(result);
      onCapture(result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // Only reset if we're leaving the drop zone entirely
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX >= rect.right ||
      event.clientY < rect.top ||
      event.clientY >= rect.bottom
    ) {
      setIsDragging(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  return (
    <Card className="overflow-hidden shadow-md border-border/50">
      {preview ? (
        <div className="space-y-0">
          <div className="relative aspect-[4/3] bg-muted">
            <img 
              src={preview} 
              alt="Food preview" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-4">
            <Button
              onClick={() => {
                setPreview(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                if (cameraInputRef.current) cameraInputRef.current.value = '';
              }}
              variant="outline"
              className="w-full"
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Another Photo
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-4">
          <div 
            className={`aspect-[4/3] bg-gradient-to-br from-muted to-muted/50 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 text-muted-foreground transition-all ${
              isDragging 
                ? 'border-primary bg-primary/5 scale-[1.02]' 
                : 'border-border hover:border-primary/50'
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center px-4 pointer-events-none">
              <p className="font-medium text-foreground">
                {isDragging ? 'Drop image here' : 'Ready to analyze'}
              </p>
              <p className="text-sm mt-1">
                {isDragging ? 'Release to upload' : 'Drag & drop, snap a photo, or upload from gallery'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled}
              className="w-full h-12"
              variant="default"
            >
              <Camera className="w-5 h-5 mr-2" />
              Camera
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              variant="outline"
              className="w-full h-12"
            >
              <Upload className="w-5 h-5 mr-2" />
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
    </Card>
  );
}