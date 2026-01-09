// supabase/functions/process-recurring-transactions/index.ts
// Edge function to process recurring transactions and generate due instances
// This should be triggered by a cron job (scheduled task) in Supabase

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RecurringTransaction {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: string | null;
  tags: string[];
  currency_code: string;
  exchange_rate: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval_count: number;
  start_date: string;
  end_date: string | null;
  occurrences_limit: number | null;
  occurrences_created: number;
  next_run_at: string;
  last_run_at: string | null;
  is_active: boolean;
}

function calculateNextDate(currentDate: string, frequency: string, intervalCount: number): string {
  const date = new Date(currentDate);
  const interval = intervalCount || 1;
  const originalDay = date.getDate();

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + interval);
      break;
    case 'weekly':
      date.setDate(date.getDate() + interval * 7);
      break;
    case 'monthly': {
      // Store original month and add interval
      const targetMonth = date.getMonth() + interval;
      date.setMonth(targetMonth);
      // If the day changed (overflow), set to last day of target month
      if (date.getDate() !== originalDay) {
        date.setDate(0); // Go to last day of previous month (which is target month)
      }
      break;
    }
    case 'yearly': {
      const targetYear = date.getFullYear() + interval;
      date.setFullYear(targetYear);
      // Handle Feb 29 on non-leap years
      if (date.getDate() !== originalDay) {
        date.setDate(0);
      }
      break;
    }
    default:
      date.setDate(date.getDate() + interval);
  }

  return date.toISOString();
}

serve(async (req: Request) => {
  // Allow CORS for testing
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cron-Secret',
      },
    });
  }

  // Validate a cron secret header if configured (protects this endpoint from public invocation)
  const cronSecret = Deno.env.get('CRON_SECRET');
  const providedSecret = req.headers.get('x-cron-secret');
  if (cronSecret) {
    if (!providedSecret || providedSecret !== cronSecret) {
      console.warn('Invalid or missing CRON_SECRET header');
      return new Response('Unauthorized', { status: 401 });
    }
  } else {
    // If no CRON_SECRET is configured, warn in logs (useful in dev but not recommended for prod)
    console.warn('No CRON_SECRET configured for process-recurring-transactions function');
  }

  // Create a Supabase client with the service role key for admin access
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const now = new Date();
  const nowISO = now.toISOString();
  const todayDate = now.toISOString().split('T')[0];

  console.log(`Processing recurring transactions at ${nowISO}`);

  try {
    // Fetch all active recurring transactions that are due
    const { data: dueRecurrings, error: fetchError } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_at', nowISO);

    if (fetchError) {
      console.error('Error fetching due recurring transactions:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!dueRecurrings || dueRecurrings.length === 0) {
      console.log('No recurring transactions due at this time');
      return new Response(
        JSON.stringify({ message: 'No recurring transactions due', generated: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${dueRecurrings.length} recurring transactions to process`);

    const results = {
      processed: 0,
      generated: 0,
      skipped: 0,
      deactivated: 0,
      errors: [] as string[],
    };

    for (const recurring of dueRecurrings as RecurringTransaction[]) {
      results.processed++;

      // Check if we've reached the occurrences limit
      if (recurring.occurrences_limit && recurring.occurrences_created >= recurring.occurrences_limit) {
        console.log(`Deactivating ${recurring.id}: occurrences limit reached`);
        await supabase
          .from('recurring_transactions')
          .update({ is_active: false })
          .eq('id', recurring.id);
        results.deactivated++;
        continue;
      }

      // Check if end_date has passed
      if (recurring.end_date && new Date(recurring.end_date) < now) {
        console.log(`Deactivating ${recurring.id}: end date passed`);
        await supabase
          .from('recurring_transactions')
          .update({ is_active: false })
          .eq('id', recurring.id);
        results.deactivated++;
        continue;
      }

      // Extract the transaction date from next_run_at
      const transactionDate = new Date(recurring.next_run_at).toISOString().split('T')[0];

      // Check for idempotency - don't create if already exists for this period
      const { data: existing, error: existingError } = await supabase
        .from('transactions')
        .select('id')
        .eq('source_recurring_id', recurring.id)
        .eq('date', transactionDate)
        .maybeSingle();

      if (existingError) {
        console.error(`Error checking existing transaction for ${recurring.id}:`, existingError);
        results.errors.push(`${recurring.id}: ${existingError.message}`);
        continue;
      }

      if (existing) {
        console.log(`Skipping ${recurring.id}: transaction already exists for ${transactionDate}`);
        // Just update next_run_at
        const nextDate = calculateNextDate(transactionDate, recurring.frequency, recurring.interval_count);
        await supabase
          .from('recurring_transactions')
          .update({
            next_run_at: nextDate,
            last_run_at: nowISO,
          })
          .eq('id', recurring.id);
        results.skipped++;
        continue;
      }

      // Calculate base_amount
      const baseAmount = recurring.amount * (recurring.exchange_rate || 1.0);

      // Determine if this is a scheduled (future) transaction
      const isScheduled = new Date(transactionDate) > now;
      // Note: User existence is guaranteed by the foreign key constraint on recurring_transactions.user_id
      // If the user was deleted, the CASCADE delete would have removed the recurring transaction too

      // Create the transaction instance
      const { error: insertError } = await supabase
        .from('transactions')
        .insert([{
          title: recurring.title,
          amount: recurring.amount,
          date: transactionDate,
          type: recurring.type,
          category_id: recurring.category_id,
          tags: recurring.tags || [],
          currency_code: recurring.currency_code,
          exchange_rate: recurring.exchange_rate,
          base_amount: baseAmount,
          user_id: recurring.user_id,
          source_recurring_id: recurring.id,
          is_scheduled: isScheduled,
        }]);

      if (insertError) {
        console.error(`Error creating transaction for ${recurring.id}:`, insertError);
        results.errors.push(`${recurring.id}: ${insertError.message}`);
        continue;
      }

      results.generated++;
      console.log(`Created transaction for recurring ${recurring.id} on ${transactionDate}`);

      // Update the recurring transaction with next run date
      const nextDate = calculateNextDate(transactionDate, recurring.frequency, recurring.interval_count);
      await supabase
        .from('recurring_transactions')
        .update({
          next_run_at: nextDate,
          last_run_at: nowISO,
          occurrences_created: (recurring.occurrences_created || 0) + 1,
        })
        .eq('id', recurring.id);
    }

    console.log('Processing complete:', results);

    return new Response(
      JSON.stringify({
        message: 'Recurring transactions processed successfully',
        ...results,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Unexpected error processing recurring transactions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
