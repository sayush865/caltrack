const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.80;

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
    quality = JPEG_QUALITY,
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

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false });
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Apply subtle enhancements via CSS filters
        let filters: string[] = [];
        
        if (enhanceContrast) {
          filters.push('contrast(1.08)');
          filters.push('brightness(1.03)');
          filters.push('saturate(1.05)');
        }

        ctx.filter = filters.join(' ');
        
        // Draw image with subtle enhancements
        ctx.drawImage(img, 0, 0, width, height);

        // Export as optimized JPEG
        const processedData = canvas.toDataURL('image/jpeg', quality);
        resolve(processedData);
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

