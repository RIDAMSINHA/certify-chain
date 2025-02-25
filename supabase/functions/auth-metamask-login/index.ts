// Import required modules from Deno standard library and external dependencies
import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@5";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

// Retrieve and validate environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
if (!SUPABASE_URL) throw new Error("SUPABASE_URL is not set");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
const JWT_SECRET = Deno.env.get("JWT_SECRET");
if (!JWT_SECRET) throw new Error("JWT_SECRET is not set");

console.log("Initializing Supabase Edge Function");

// Create a Supabase admin client (with service role privileges)
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Define CORS headers (adjust allowed origin in production)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

// Import the JWT secret as a CryptoKey instead of a plain Uint8Array.
// This is required because djwt needs a key with proper properties (like name)
const key = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(JWT_SECRET),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"]
);

serve(async (req) => {
  console.log("Received request:", req.method, req.url);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling preflight (OPTIONS) request");
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  try {
    console.log("Parsing JSON request body");
    const { walletAddress, signature, message } = await req.json();
    console.log("Parsed body:", { walletAddress, signature, message });

    if (!walletAddress || !signature || !message) {
      console.error("Missing parameters");
      return new Response(
        JSON.stringify({ error: "Missing parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Verifying signature for wallet address:", walletAddress);
    let recoveredAddress;
    try {
      recoveredAddress = ethers.utils.verifyMessage(message, signature);
      console.log("Recovered address:", recoveredAddress);
    } catch (sigError) {
      console.error("Error during signature verification:", sigError);
      throw new Error("Invalid signature format");
    }

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      console.error("Signature verification failed", {
        provided: walletAddress,
        recovered: recoveredAddress,
      });
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    console.log("Signature verified successfully");

    console.log("Querying Supabase for profile with wallet address:", walletAddress);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found or error:", profileError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    console.log("Profile retrieved:", profile);

    console.log("Generating JWT tokens using djwt");

    const issuer = "https://peatdsafjrwjoimjmugm.supabase.co";
    const access_payload = {
      sub: profile.id,
      aud: "authenticated",
      role: "authenticated",
      iss: issuer,
      iat: getNumericDate(0),
      exp: getNumericDate(60 * 60), // 1 hour expiration
    };
    const refresh_payload = {
      sub: profile.id,
      aud: "authenticated",
      role: "authenticated",
      iss: issuer,
      iat: getNumericDate(0),
      exp: getNumericDate(60 * 60 * 24 * 7), // 7 days expiration
    };
    
    const access_token = await create({ alg: "HS256", typ: "JWT" }, access_payload, key);
    const refresh_token = await create({ alg: "HS256", typ: "JWT" }, refresh_payload, key);
    console.log("JWT tokens generated");

    console.log("Returning session tokens to client");
    return new Response(
      JSON.stringify({ session: { access_token, refresh_token } }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in Edge Function:", error.stack || error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
