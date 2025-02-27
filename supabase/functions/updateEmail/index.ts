
import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Read environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Create a Supabase client using the service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Set CORS headers (adjust Access-Control-Allow-Origin for production)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  // Handle preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { userId, newEmail, password } = await req.json();

    if (!userId || !newEmail) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400, headers: corsHeaders });
    }

    // Update the user with new email and metadata.
    // Using the admin API allows updating even sensitive fields.
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: newEmail,
      password: password,
      user_metadata: { email: newEmail },
    });

    if (error) throw error;

    return new Response(JSON.stringify({ user: data.user }), { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Error updating user metadata:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
  
});
