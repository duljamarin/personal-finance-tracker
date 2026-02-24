// supabase/functions/delete-user/index.ts
// Cancels any active Paddle subscription, deletes all application data,
// then removes the authenticated user's auth.users record.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY")!;
const PADDLE_ENVIRONMENT = Deno.env.get("PADDLE_ENVIRONMENT") || "sandbox";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Verify the caller is authenticated
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use the anon client + user JWT to confirm the token is valid and get the user id
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Fetch subscription before any data is deleted
    const { data: subscription } = await adminClient
      .from("subscriptions")
      .select("paddle_subscription_id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    // Step 2: Cancel Paddle subscription if one is active
    if (
      subscription?.paddle_subscription_id &&
      !["none", "cancelled"].includes(subscription.status ?? "")
    ) {
      const paddleApiUrl =
        PADDLE_ENVIRONMENT === "production"
          ? "https://api.paddle.com"
          : "https://sandbox-api.paddle.com";
      try {
        const paddleRes = await fetch(
          `${paddleApiUrl}/subscriptions/${subscription.paddle_subscription_id}/cancel`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${PADDLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ effective_from: "immediately" }),
          }
        );
        if (!paddleRes.ok) {
          const body = await paddleRes.text();
          console.error("Paddle cancellation returned non-OK:", paddleRes.status, body);
        } else {
          console.log(`Paddle subscription ${subscription.paddle_subscription_id} cancelled for user ${user.id}`);
        }
      } catch (paddleError) {
        // Log but do not block account deletion on a Paddle error
        console.error("Paddle cancellation request failed:", paddleError);
      }
    }

    // Step 3: Delete all application data via RPC (anon client preserves auth.uid())
    const { error: rpcError } = await userClient.rpc("delete_user_account");
    if (rpcError) {
      console.error("Failed to delete application data:", rpcError);
      return new Response(
        JSON.stringify({ error: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Delete the auth.users record
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
