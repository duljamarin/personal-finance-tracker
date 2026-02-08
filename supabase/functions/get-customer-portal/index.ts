// supabase/functions/get-customer-portal/index.ts
// Edge function to get Paddle subscription management URLs

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY")!;
const PADDLE_ENVIRONMENT = Deno.env.get("PADDLE_ENVIRONMENT") || "sandbox";

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user with Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("paddle_subscription_id, paddle_customer_id")
      .eq("user_id", user.id)
      .single();

    if (subError || !subscription?.paddle_subscription_id) {
      return new Response(
        JSON.stringify({ error: "No active subscription found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch subscription details from Paddle API to get management URLs
    const paddleApiUrl =
      PADDLE_ENVIRONMENT === "production"
        ? "https://api.paddle.com"
        : "https://sandbox-api.paddle.com";

    const response = await fetch(
      `${paddleApiUrl}/subscriptions/${subscription.paddle_subscription_id}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${PADDLE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Paddle API error:", errorText);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch subscription details",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const paddleData = await response.json();
    const subscriptionData = paddleData.data;

    // Extract management URLs
    const updatePaymentUrl = subscriptionData?.management_urls?.update_payment_method;
    const cancelUrl = subscriptionData?.management_urls?.cancel;

    if (!updatePaymentUrl && !cancelUrl) {
      return new Response(
        JSON.stringify({ error: "No management URLs available for this subscription" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        update_payment_url: updatePaymentUrl || null,
        cancel_url: cancelUrl || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error fetching subscription management:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
