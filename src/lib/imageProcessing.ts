const MAX_DIMENSION = 768;
const QUALITY = 0.75;

interface ProcessImageOptions {
  maxDimension?: number;
  quality?: number;
  enhanceContrast?: boolean;
}

export async function processImageForAI(
  imageData: string,
  options: ProcessImageOptions = {}
): Promise<string> {
  const {
    maxDimension = MAX_DIMENSION,
    quality = QUALITY,
    enhanceContrast = true,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        // Use OffscreenCanvas if available for non-blocking processing
        let canvas: HTMLCanvasElement | OffscreenCanvas;
        let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
        
        if (typeof OffscreenCanvas !== 'undefined') {
          canvas = new OffscreenCanvas(width, height);
          ctx = canvas.getContext('2d', { alpha: false });
        } else {
          canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          ctx = canvas.getContext('2d', { alpha: false });
        }
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Apply subtle enhancements via CSS filters
        if (enhanceContrast) {
          (ctx as any).filter = 'contrast(1.05) brightness(1.02) saturate(1.03)';
        }
        
        // Draw image with enhancements
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first, fallback to JPEG
        const tryWebP = async () => {
          if (canvas instanceof OffscreenCanvas) {
            try {
              const blob = await canvas.convertToBlob({ type: 'image/webp', quality });
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error('Failed to read blob'));
              reader.readAsDataURL(blob);
            } catch {
              // Fallback to JPEG for OffscreenCanvas
              const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error('Failed to read blob'));
              reader.readAsDataURL(blob);
            }
          } else {
            // Try WebP, check if it's supported
            const webpData = canvas.toDataURL('image/webp', quality);
            if (webpData.startsWith('data:image/webp')) {
              resolve(webpData);
            } else {
              // Fallback to JPEG
              resolve(canvas.toDataURL('image/jpeg', quality));
            }
          }
        };

        tryWebP();
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageData;
  });
}
