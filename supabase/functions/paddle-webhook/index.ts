// supabase/functions/paddle-webhook/index.ts
// Edge function to handle Paddle webhook events for subscription management

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PADDLE_WEBHOOK_SECRET = Deno.env.get("PADDLE_WEBHOOK_SECRET")!;
const PADDLE_MONTHLY_PRICE_ID = Deno.env.get("PADDLE_MONTHLY_PRICE_ID") || "";
const PADDLE_YEARLY_PRICE_ID = Deno.env.get("PADDLE_YEARLY_PRICE_ID") || "";

function derivePlan(priceId: string): "monthly" | "yearly" | null {
  if (priceId === PADDLE_MONTHLY_PRICE_ID) return "monthly";
  if (priceId === PADDLE_YEARLY_PRICE_ID) return "yearly";
  return null;
}

function derivePlanFromAmount(amount: number): "monthly" | "yearly" | null {
  // Fallback: detect plan based on transaction amount
  // Adjust these thresholds based on your actual pricing
  if (amount >= 40 && amount <= 60) return "yearly";  // ~50 EUR yearly
  if (amount >= 4 && amount <= 10) return "monthly";   // ~5-8 EUR monthly
  return null;
}

async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  // Paddle signature format: ts=TIMESTAMP;h1=HASH
  const parts: Record<string, string> = {};
  for (const part of signatureHeader.split(";")) {
    const [key, value] = part.split("=");
    if (key && value) parts[key] = value;
  }

  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  // Reconstruct signed payload: ts:rawBody
  const signedPayload = `${ts}:${rawBody}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedPayload)
  );

  const computedHash = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedHash === h1;
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Paddle-Signature",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get("Paddle-Signature") || "";

  // Verify webhook signature
  if (PADDLE_WEBHOOK_SECRET) {
    const isValid = await verifyWebhookSignature(
      rawBody,
      signatureHeader,
      PADDLE_WEBHOOK_SECRET
    );
    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const eventType: string = event.event_type;
  const data = event.data;

  console.log(`Received Paddle event: ${eventType}`);

  // Extract user_id from custom_data (passed during checkout)
  const userId = data?.custom_data?.user_id;
  if (!userId) {
    console.error("No user_id in custom_data:", JSON.stringify(data?.custom_data));
    return new Response(
      JSON.stringify({ error: "Missing user_id in custom_data" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    switch (eventType) {
      case "subscription.created": {
        const priceId = data.items?.[0]?.price?.id || "";
        let plan = derivePlan(priceId);
        const status = data.status || "active";

        const upsertData: Record<string, any> = {
          user_id: userId,
          paddle_subscription_id: data.id,
          paddle_customer_id: data.customer_id,
          status,
          plan,
          price_id: priceId,
          current_period_start: data.current_billing_period?.starts_at || null,
          current_period_end: data.current_billing_period?.ends_at || null,
        };

        // Log plan detection for debugging
        console.log(`Plan detection: priceId=${priceId}, derivedPlan=${plan}`);
        console.log(`ENV: PADDLE_MONTHLY_PRICE_ID=${PADDLE_MONTHLY_PRICE_ID}, PADDLE_YEARLY_PRICE_ID=${PADDLE_YEARLY_PRICE_ID}`);

        // Capture initial pricing info if available
        if (data.items?.[0]?.price) {
          const priceAmount = data.items[0].price.unit_price?.amount;
          if (priceAmount) {
            const amount = parseFloat(priceAmount) / 100;
            upsertData.last_transaction_amount = amount;
            upsertData.last_transaction_currency = data.items[0].price.unit_price?.currency_code || 'EUR';
            console.log(`Initial price captured: ${amount} ${upsertData.last_transaction_currency}`);
            
            // Fallback: If plan couldn't be derived from priceId, use amount
            if (!plan) {
              const planFromAmount = derivePlanFromAmount(amount);
              if (planFromAmount) {
                plan = planFromAmount;
                upsertData.plan = plan;
                console.warn(`⚠️ Plan derived from amount fallback: ${amount} → ${plan}`);
              }
            } else {
              // Verify plan matches amount
              const expectedPlan = derivePlanFromAmount(amount);
              if (expectedPlan && expectedPlan !== plan) {
                console.error(`❌ PLAN MISMATCH: priceId suggests ${plan} but amount ${amount} suggests ${expectedPlan}`);
                // Trust the amount over priceId
                plan = expectedPlan;
                upsertData.plan = plan;
              }
            }
          }
        }

        // Handle trial
        if (status === "trialing" && data.current_billing_period) {
          upsertData.trial_start = data.current_billing_period.starts_at;
          upsertData.trial_end = data.current_billing_period.ends_at;
        }

        const { error } = await supabase
          .from("subscriptions")
          .upsert(upsertData, { onConflict: "user_id" });

        if (error) throw error;
        console.log(`Subscription created for user ${userId}: status=${status}, plan=${plan}, priceId=${priceId}`);
        break;
      }

      case "subscription.updated": {
        const priceId = data.items?.[0]?.price?.id || "";
        let plan = derivePlan(priceId);

        const updateData: Record<string, any> = {
          status: data.status,
          plan: plan || undefined,
          price_id: priceId || undefined,
          current_period_start: data.current_billing_period?.starts_at || null,
          current_period_end: data.current_billing_period?.ends_at || null,
        };

        // Check if we can derive plan from pricing info
        if (data.items?.[0]?.price?.unit_price?.amount) {
          const amount = parseFloat(data.items[0].price.unit_price.amount) / 100;
          if (!plan) {
            plan = derivePlanFromAmount(amount);
            updateData.plan = plan || undefined;
            console.log(`Plan derived from amount on update: ${amount} → ${plan}`);
          }
        }

        if (data.scheduled_change?.action === "cancel") {
          updateData.cancel_at = data.scheduled_change.effective_at;
        }

        const { error } = await supabase
          .from("subscriptions")
          .update(updateData)
          .eq("user_id", userId);

        if (error) throw error;
        console.log(`Subscription updated for user ${userId}: ${data.status}, plan: ${plan}`);
        break;
      }

      case "subscription.activated": {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            trial_start: null,
            trial_end: null,
          })
          .eq("user_id", userId);

        if (error) throw error;
        console.log(`Subscription activated for user ${userId}`);
        break;
      }

      case "subscription.canceled": {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            cancelled_at: data.canceled_at || new Date().toISOString(),
            cancel_at: data.scheduled_change?.effective_at || null,
          })
          .eq("user_id", userId);

        if (error) throw error;
        console.log(`Subscription cancelled for user ${userId}`);
        break;
      }

      case "subscription.paused": {
        const { error } = await supabase
          .from("subscriptions")
          .update({ status: "paused" })
          .eq("user_id", userId);

        if (error) throw error;
        console.log(`Subscription paused for user ${userId}`);
        break;
      }

      case "subscription.resumed": {
        const { error } = await supabase
          .from("subscriptions")
          .update({ status: "active" })
          .eq("user_id", userId);

        if (error) throw error;
        console.log(`Subscription resumed for user ${userId}`);
        break;
      }

      case "subscription.past_due": {
        const { error } = await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("user_id", userId);

        if (error) throw error;
        console.log(`Subscription past due for user ${userId}`);
        break;
      }

      case "transaction.completed": {
        const subscriptionId = data.subscription_id;
        if (subscriptionId) {
          // Extract transaction amount and currency from Paddle webhook data
          const amount = data.details?.totals?.total 
            ? parseFloat(data.details.totals.total) / 100  // Paddle sends in cents
            : null;
          const currency = data.currency_code || 'EUR';
          
          const updateData: Record<string, any> = {
            paddle_transaction_id: data.id,
            last_transaction_date: data.billed_at || new Date().toISOString(),
          };
          
          if (amount !== null) {
            updateData.last_transaction_amount = amount;
            updateData.last_transaction_currency = currency;
            
            // Check if plan needs correction based on actual transaction amount
            const planFromAmount = derivePlanFromAmount(amount);
            if (planFromAmount) {
              // Get current subscription to check for mismatch
              const { data: currentSub } = await supabase
                .from("subscriptions")
                .select("plan")
                .eq("paddle_subscription_id", subscriptionId)
                .single();
              
              if (currentSub && currentSub.plan !== planFromAmount) {
                console.warn(`⚠️ Correcting plan mismatch: DB has ${currentSub.plan} but transaction amount ${amount} indicates ${planFromAmount}`);
                updateData.plan = planFromAmount;
              }
            }
          }

          const { error } = await supabase
            .from("subscriptions")
            .update(updateData)
            .eq("paddle_subscription_id", subscriptionId);

          if (error) throw error;
          console.log(`Transaction completed for subscription ${subscriptionId}: ${amount} ${currency}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response(
      JSON.stringify({ success: true, event_type: eventType }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Error processing webhook:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
