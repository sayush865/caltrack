const MAX_DIMENSION = 1536;
const JPEG_QUALITY = 0.88;

interface ProcessImageOptions {
  maxDimension?: number;
  quality?: number;
  enhanceContrast?: boolean;
  sharpen?: boolean;
}

export async function processImageForAI(
  imageData: string,
  options: ProcessImageOptions = {}
): Promise<string> {
  const {
    maxDimension = MAX_DIMENSION,
    quality = JPEG_QUALITY,
    enhanceContrast = true,
    sharpen = true,
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

        // Apply enhancements via CSS filters
        let filters: string[] = [];
        
        if (enhanceContrast) {
          filters.push('contrast(1.1)');
          filters.push('brightness(1.05)');
          filters.push('saturate(1.1)');
        }
        
        if (sharpen) {
          // Sharpen is applied via pixel manipulation below
          filters.push('contrast(1.05)');
        }

        ctx.filter = filters.join(' ');
        
        // Draw image with enhancements
        ctx.drawImage(img, 0, 0, width, height);
        
        // Apply sharpening via convolution if requested
        if (sharpen) {
          applySharpening(ctx, width, height);
        }

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

function applySharpening(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const weights = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const side = Math.round(Math.sqrt(weights.length));
  const halfSide = Math.floor(side / 2);
  const output = ctx.createImageData(width, height);
  const dst = output.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dstOff = (y * width + x) * 4;
      let r = 0, g = 0, b = 0;

      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = Math.min(height - 1, Math.max(0, y + cy - halfSide));
          const scx = Math.min(width - 1, Math.max(0, x + cx - halfSide));
          const srcOff = (scy * width + scx) * 4;
          const wt = weights[cy * side + cx];
          
          r += data[srcOff] * wt;
          g += data[srcOff + 1] * wt;
          b += data[srcOff + 2] * wt;
        }
      }

      dst[dstOff] = Math.min(255, Math.max(0, r));
      dst[dstOff + 1] = Math.min(255, Math.max(0, g));
      dst[dstOff + 2] = Math.min(255, Math.max(0, b));
      dst[dstOff + 3] = data[dstOff + 3]; // Alpha channel unchanged
    }
  }

  ctx.putImageData(output, 0, 0);
}
