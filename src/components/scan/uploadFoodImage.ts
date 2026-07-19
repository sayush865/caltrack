// Parallel image upload to the public 'food-images' bucket.
// Same path pattern as legacy pages/Camera.tsx: `${user.id}/${Date.now()}.<ext>`.
// Fire-and-forget friendly: resolves null on any failure (a meal can save without its photo).

import { supabase } from "@/integrations/supabase/client";

export async function uploadFoodImage(imageDataUrl: string): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const [header, base64Data] = imageDataUrl.split(",");
    if (!base64Data) return null;
    const mimeType = header.split(";")[0].split(":")[1] || "image/webp";
    const ext = mimeType.includes("webp") ? "webp" : mimeType.includes("png") ? "png" : "jpg";
    const fileName = `${user.id}/${Date.now()}.${ext}`;

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const { data, error } = await supabase.storage
      .from("food-images")
      .upload(fileName, bytes, { contentType: mimeType, upsert: false });
    if (error || !data) return null;

    return supabase.storage.from("food-images").getPublicUrl(data.path).data.publicUrl;
  } catch {
    return null;
  }
}
