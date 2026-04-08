// supabase/functions/paddle-webhook/index.ts
// Edge function to handle Paddle webhook events for subscription management

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const PADDLE_WEBHOOK_SECRET = Deno.env.get("PADDLE_WEBHOOK_SECRET");
const PADDLE_MONTHLY_PRICE_ID = Deno.env.get("PADDLE_MONTHLY_PRICE_ID") || "";
const PADDLE_YEARLY_PRICE_ID = Deno.env.get("PADDLE_YEARLY_PRICE_ID") || "";
const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY") || "";
const PADDLE_API_BASE = "https://api.paddle.com";

// UUID v4 format validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function derivePlan(priceId: string): "monthly" | "yearly" | null {
  if (priceId === PADDLE_MONTHLY_PRICE_ID) return "monthly";
  if (priceId === PADDLE_YEARLY_PRICE_ID) return "yearly";
  return null;
}

function derivePlanFromAmount(amount: number): "monthly" | "yearly" | null {
  // Fallback: detect plan based on transaction amount
  // Only used when priceId-based detection fails
  if (amount >= 30 && amount <= 50) return "yearly";
  if (amount >= 4 && amount <= 10) return "monthly";
  return null;
}

/**
 * Tell Paddle to skip the trial and bill immediately.
 * Called when we detect a returning customer who should not receive a second trial.
 * If PADDLE_API_KEY is not configured the function logs a warning and returns - our DB
 * will still be correct (status=active), but Paddle will bill at its own trial end date.
 */
async function skipPaddleTrial(paddleSubscriptionId: string): Promise<void> {
  if (!PADDLE_API_KEY) {
    console.warn("PADDLE_API_KEY not set - cannot skip trial on Paddle side for", paddleSubscriptionId);
    return;
  }

  try {
    const res = await fetch(`${PADDLE_API_BASE}/subscriptions/${paddleSubscriptionId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${PADDLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ next_billed_at: "immediately" }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Failed to skip Paddle trial for ${paddleSubscriptionId}: ${res.status} ${body}`);
    } else {
      console.log(`Paddle trial skipped for subscription ${paddleSubscriptionId}`);
    }
  } catch (err) {
    console.error(`Error calling Paddle API to skip trial for ${paddleSubscriptionId}:`, err);
  }
}

/** Constant-time string comparison to prevent timing attacks */
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  // Use the longer length to avoid leaking length info via early return
  const maxLen = Math.max(bufA.length, bufB.length);
  let result = bufA.length ^ bufB.length; // non-zero if lengths differ
  for (let i = 0; i < maxLen; i++) {
    result |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return result === 0;
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

  // Reject timestamps older than 5 minutes to prevent replay attacks
  const timestampAge = Math.abs(Date.now() / 1000 - parseInt(ts, 10));
  if (isNaN(timestampAge) || timestampAge > 300) return false;

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

  return timingSafeEqual(computedHash, h1);
}

serve(async (req: Request) => {
  // Webhooks are server-to-server - no CORS needed
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 405 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate required environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get("Paddle-Signature") || "";

  // Always verify webhook signature - fail if secret is missing
  if (!PADDLE_WEBHOOK_SECRET) {
    console.error("PADDLE_WEBHOOK_SECRET is not configured - rejecting webhook");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

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
  const eventId: string = event.event_id || "";
  const data = event.data;

  console.log(`Received Paddle event: ${eventType} (${eventId})`);

  // Extract and validate user_id from custom_data
  const userId = data?.custom_data?.user_id;
  if (!userId) {
    console.error("No user_id in custom_data");
    return new Response(
      JSON.stringify({ error: "Missing user_id in custom_data" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (typeof userId !== "string" || !UUID_REGEX.test(userId)) {
    console.error("Invalid user_id format:", userId);
    return new Response(
      JSON.stringify({ error: "Invalid user_id format" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Idempotency check: skip if this event was already processed
  if (eventId) {
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("last_event_id")
      .eq("user_id", userId)
      .single();

    if (existing?.last_event_id === eventId) {
      console.log(`Event ${eventId} already processed, skipping`);
      return new Response(
        JSON.stringify({ success: true, event_type: eventType, skipped: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  try {
    switch (eventType) {
      case "subscription.created": {
        const priceId = data.items?.[0]?.price?.id || "";
        let plan = derivePlan(priceId);
        let status = data.status || "active";

        // --- Trial guard ---
        // Fetch the existing subscription row to check had_trial.
        // A user is only entitled to one trial - their very first subscription.
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("had_trial")
          .eq("user_id", userId)
          .single();

        const hadTrialBefore: boolean = existingSub?.had_trial === true;
        const isRequestingTrial: boolean = status === "trialing";
        const isFirstTrial: boolean = isRequestingTrial && !hadTrialBefore;
        const isIllegalSecondTrial: boolean = isRequestingTrial && hadTrialBefore;

        if (isIllegalSecondTrial) {
          // Override: treat this re-subscribe as a regular active subscription.
          console.warn(`User ${userId} attempted a second trial - overriding status to active.`);
          status = "active";
          // Ask Paddle to skip the trial period and bill immediately.
          // Fire-and-forget; failure is logged inside skipPaddleTrial but does not
          // block the DB update - our feature gating is driven by our DB status.
          skipPaddleTrial(data.id);
        }

        const upsertData: Record<string, any> = {
          user_id: userId,
          paddle_subscription_id: data.id,
          paddle_customer_id: data.customer_id,
          status,
          plan,
          price_id: priceId,
          current_period_start: data.current_billing_period?.starts_at || null,
          current_period_end: data.current_billing_period?.ends_at || null,
          // Always clear cancellation fields for new subscriptions
          cancel_at: null,
          cancelled_at: null,
        };

        if (eventId) upsertData.last_event_id = eventId;

        // Handle trial dates
        if (status === "trialing" && data.current_billing_period) {
          // First legitimate trial
          upsertData.trial_start = data.current_billing_period.starts_at;
          upsertData.trial_end = data.current_billing_period.ends_at;
          upsertData.had_trial = true;       // mark trial as consumed
        } else {
          // Not a trial (new subscription, re-subscribe, or overridden second trial).
          // Clear any stale trial dates left over from the previous subscription.
          upsertData.trial_start = null;
          upsertData.trial_end = null;
          // had_trial is never reset - preserve whatever the DB already has.
          // If this IS the first subscription and it's active (no trial), keep had_trial=false.
          // Only force it to true when a real trial fires.
        }

        // Capture initial pricing info if available
        if (data.items?.[0]?.price) {
          const priceAmount = data.items[0].price.unit_price?.amount;
          if (priceAmount) {
            const amount = parseFloat(priceAmount) / 100;
            upsertData.last_transaction_amount = amount;
            upsertData.last_transaction_currency = data.items[0].price.unit_price?.currency_code || 'EUR';

            // Fallback: only use amount-based detection if priceId detection failed
            if (!plan) {
              const planFromAmount = derivePlanFromAmount(amount);
              if (planFromAmount) {
                plan = planFromAmount;
                upsertData.plan = plan;
                console.warn(`Plan derived from amount fallback: ${amount} -> ${plan}`);
              }
            }
            // Do NOT override priceId-based plan with amount - priceId is authoritative
          }
        }

        const { error } = await supabase
          .from("subscriptions")
          .upsert(upsertData, { onConflict: "user_id" });

        if (error) throw error;
        console.log(`Subscription created for user ${userId}: status=${status}, plan=${plan}, hadTrial=${hadTrialBefore}, firstTrial=${isFirstTrial}`);
        break;
      }

      case "subscription.updated": {
        // Verify this event is for the current subscription
        const { data: currentSub } = await supabase
          .from("subscriptions")
          .select("paddle_subscription_id, had_trial")
          .eq("user_id", userId)
          .single();

        if (currentSub?.paddle_subscription_id && currentSub.paddle_subscription_id !== data.id) {
          console.warn(`Ignoring update for old subscription ${data.id}, current is ${currentSub.paddle_subscription_id}`);
          break;
        }

        const priceId = data.items?.[0]?.price?.id || "";
        let plan = derivePlan(priceId);

        // Trial guard: if Paddle sends trialing for a returning customer, override to active.
        let updatedStatus: string = data.status;
        if (updatedStatus === "trialing" && currentSub?.had_trial === true) {
          console.warn(`User ${userId} subscription.updated with trialing but had_trial=true - overriding to active.`);
          updatedStatus = "active";
          skipPaddleTrial(data.id);
        }

        const updateData: Record<string, any> = {
          paddle_subscription_id: data.id,
          status: updatedStatus,
          current_period_start: data.current_billing_period?.starts_at || null,
          current_period_end: data.current_billing_period?.ends_at || null,
        };

        // Only include plan and price_id if we have real values (avoid writing null/undefined)
        if (plan) updateData.plan = plan;
        if (priceId) updateData.price_id = priceId;
        if (eventId) updateData.last_event_id = eventId;

        // Fallback plan detection from amount only if priceId didn't match
        if (!plan && data.items?.[0]?.price?.unit_price?.amount) {
          const amount = parseFloat(data.items[0].price.unit_price.amount) / 100;
          plan = derivePlanFromAmount(amount);
          if (plan) updateData.plan = plan;
        }

        if (data.scheduled_change?.action === "cancel") {
          updateData.cancel_at = data.scheduled_change.effective_at;
        } else {
          // Clear cancellation fields if no scheduled cancel (e.g. reactivated)
          updateData.cancel_at = null;
          updateData.cancelled_at = null;
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
        // Check if this is a new subscription activation vs old cancelled one
        const { data: currentSub } = await supabase
          .from("subscriptions")
          .select("status, paddle_subscription_id")
          .eq("user_id", userId)
          .single();

        const currentStatus = currentSub?.status || "";
        const currentSubId = currentSub?.paddle_subscription_id || "";
        
        // Only ignore if status is cancelled AND it's the same subscription ID
        if (currentStatus === "cancelled" && currentSubId === data.id) {
          console.warn(`Ignoring activation for cancelled subscription ${data.id} (user ${userId})`);
          break;
        }

        // If different subscription ID, this is a new sub replacing the old one - always activate
        const updateData: Record<string, any> = {
          paddle_subscription_id: data.id,
          status: "active",
          cancel_at: null,
          cancelled_at: null,
          // Preserve trial dates for analytics instead of clearing them
        };
        if (eventId) updateData.last_event_id = eventId;

        const { error } = await supabase
          .from("subscriptions")
          .update(updateData)
          .eq("user_id", userId);

        if (error) throw error;
        console.log(`Subscription activated for user ${userId}`);
        break;
      }

      case "subscription.canceled": {
        // Only process cancellation if it's for the current subscription
        const { data: currentSub } = await supabase
          .from("subscriptions")
          .select("paddle_subscription_id")
          .eq("user_id", userId)
          .single();

        if (currentSub?.paddle_subscription_id && currentSub.paddle_subscription_id !== data.id) {
          console.warn(`Ignoring cancellation for old subscription ${data.id}, current is ${currentSub.paddle_subscription_id}`);
          break;
        }

        const updateData: Record<string, any> = {
          status: "cancelled",
          cancelled_at: data.canceled_at || new Date().toISOString(),
          cancel_at: data.scheduled_change?.effective_at || null,
        };
        if (eventId) updateData.last_event_id = eventId;

        const { error } = await supabase
          .from("subscriptions")
          .update(updateData)
          .eq("user_id", userId);

        if (error) throw error;
        console.log(`Subscription cancelled for user ${userId}`);
        break;
      }

      case "subscription.paused": {
        // Only process if it's for the current subscription
        const { data: currentSub } = await supabase
          .from("subscriptions")
          .select("paddle_subscription_id")
          .eq("user_id", userId)
          .single();

        if (currentSub?.paddle_subscription_id && currentSub.paddle_subscription_id !== data.id) {
          console.warn(`Ignoring pause for old subscription ${data.id}, current is ${currentSub.paddle_subscription_id}`);
          break;
        }

        const updateData: Record<string, any> = { status: "paused" };
        if (eventId) updateData.last_event_id = eventId;

        const { error } = await supabase
          .from("subscriptions")
          .update(updateData)
          .eq("user_id", userId);

        if (error) throw error;
        console.log(`Subscription paused for user ${userId}`);
        break;
      }

      case "subscription.resumed": {
        // Only process if it's for the current subscription
        const { data: currentSub } = await supabase
          .from("subscriptions")
          .select("paddle_subscription_id")
          .eq("user_id", userId)
          .single();

        if (currentSub?.paddle_subscription_id && currentSub.paddle_subscription_id !== data.id) {
          console.warn(`Ignoring resume for old subscription ${data.id}, current is ${currentSub.paddle_subscription_id}`);
          break;
        }

        const updateData: Record<string, any> = { status: "active", cancel_at: null, cancelled_at: null };
        if (eventId) updateData.last_event_id = eventId;

        const { error } = await supabase
          .from("subscriptions")
          .update(updateData)
          .eq("user_id", userId);

        if (error) throw error;
        console.log(`Subscription resumed for user ${userId}`);
        break;
      }

      case "subscription.past_due": {
        // Only process if it's for the current subscription
        const { data: currentSub } = await supabase
          .from("subscriptions")
          .select("paddle_subscription_id")
          .eq("user_id", userId)
          .single();

        if (currentSub?.paddle_subscription_id && currentSub.paddle_subscription_id !== data.id) {
          console.warn(`Ignoring past_due for old subscription ${data.id}, current is ${currentSub.paddle_subscription_id}`);
          break;
        }

        const updateData: Record<string, any> = { status: "past_due" };
        if (eventId) updateData.last_event_id = eventId;

        const { error } = await supabase
          .from("subscriptions")
          .update(updateData)
          .eq("user_id", userId);

        if (error) throw error;
        console.log(`Subscription past due for user ${userId}`);
        break;
      }

      case "transaction.completed": {
        const subscriptionId = data.subscription_id;
        if (subscriptionId) {
          const amount = data.details?.totals?.total
            ? parseFloat(data.details.totals.total) / 100
            : null;
          const currency = data.currency_code || 'EUR';

          const updateData: Record<string, any> = {
            paddle_transaction_id: data.id,
            last_transaction_date: data.billed_at || new Date().toISOString(),
          };

          if (eventId) updateData.last_event_id = eventId;

          if (amount !== null) {
            updateData.last_transaction_amount = amount;
            updateData.last_transaction_currency = currency;

            // Only use amount-based plan correction if priceId detection is not available
            const priceId = data.items?.[0]?.price?.id || "";
            const planFromPriceId = derivePlan(priceId);

            if (planFromPriceId) {
              // We have a reliable priceId - use it to correct plan if needed
              const { data: currentSub } = await supabase
                .from("subscriptions")
                .select("plan")
                .eq("paddle_subscription_id", subscriptionId)
                .single();

              if (currentSub && currentSub.plan !== planFromPriceId) {
                console.warn(`Correcting plan from ${currentSub.plan} to ${planFromPriceId} based on priceId`);
                updateData.plan = planFromPriceId;
              }
            } else {
              // No priceId match - log amount for debugging but don't override plan
              const planFromAmount = derivePlanFromAmount(amount);
              if (planFromAmount) {
                console.log(`Amount ${amount} suggests plan ${planFromAmount} (no priceId match - not overriding)`);
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
        },
      }
    );
  } catch (error: unknown) {
    console.error("Error processing webhook:", error);
    // Don't expose internal error details
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
