import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Read environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Create a Supabase client with the service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Change to your frontend domain in production
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Ensure CORS headers are included in all responses
    const headers = new Headers(corsHeaders);

    const { email, password, walletAddress } = await req.json();

    if (!email || !password || !walletAddress) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400, headers });
    }

    // Create a new user
    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { wallet_address: walletAddress },
    });

    if (createError) throw createError;

    // Sign in the user
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) throw signInError;

    return new Response(JSON.stringify({ session: signInData.session }), { status: 200, headers });
  } catch (error) {
    console.error("Error in auth-metamask function:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
