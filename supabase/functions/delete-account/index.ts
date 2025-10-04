import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    console.log(`Deleting account for user: ${userId}`);

    // Delete user's data (cascading deletes will handle food_logs, user_goals, profiles)
    // The ON DELETE CASCADE foreign key constraints will clean up related data
    
    // Delete storage objects
    const { data: files } = await supabaseAdmin.storage
      .from('food-images')
      .list(userId);

    if (files && files.length > 0) {
      const filePaths = files.map(file => `${userId}/${file.name}`);
      await supabaseAdmin.storage
        .from('food-images')
        .remove(filePaths);
      console.log(`Deleted ${filePaths.length} storage files`);
    }

    // Delete the auth user (this will cascade and trigger profile deletion)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      throw deleteError;
    }

    console.log('Account deleted successfully');

    return new Response(
      JSON.stringify({ message: 'Account deleted successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in delete-account function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to delete account' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
