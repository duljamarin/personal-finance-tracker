# Supabase & PostgreSQL Features Used in This Project

A reference of every PostgreSQL and Supabase feature used in the **Personal Finance Tracker** backend: how each works, why it matters, and where it appears in the schema.

Schema lives in `supabase_migrations/` (52 `.sql` files). Edge Functions live in `supabase/functions/` (10 Deno functions).

Entries marked **✅ Correctly used** call out a pattern this codebase gets right and that is worth preserving. A few entries carry a **⚠️ Caveat** where the same feature is used correctly in one place and inconsistently in another.

---

## Table of Contents

**Security & access control**
1. [Row Level Security (RLS)](#1-row-level-security-rls)
2. [RLS Policies with `auth.uid()`](#2-rls-policies-with-authuid)
3. [Deny-All RLS (service-role-only tables)](#3-deny-all-rls-service-role-only-tables)
4. [Explicit Data API GRANTs](#4-explicit-data-api-grants)
5. [SECURITY DEFINER Functions](#5-security-definer-functions)
6. [Pinned `search_path`](#6-pinned-search_path)
7. [IDOR Guards Inside RPCs](#7-idor-guards-inside-rpcs)
8. [REVOKE on Internal Helpers](#8-revoke-on-internal-helpers)

**Schema design**
9. [UUID Primary Keys with `gen_random_uuid()`](#9-uuid-primary-keys-with-gen_random_uuid)
10. [Foreign Keys with `ON DELETE CASCADE`](#10-foreign-keys-with-on-delete-cascade)
11. [CHECK Constraints](#11-check-constraints)
12. [UNIQUE Constraints](#12-unique-constraints)
13. [Partial Unique Indexes](#13-partial-unique-indexes)
14. [Composite & Partial Indexes](#14-composite--partial-indexes)
15. [JSONB Columns](#15-jsonb-columns)
16. [`timestamptz` and `now()` Defaults](#16-timestamptz-and-now-defaults)

**Procedural logic**
17. [PL/pgSQL Functions](#17-plpgsql-functions)
18. [Triggers (BEFORE INSERT / BEFORE UPDATE)](#18-triggers-before-insert--before-update)
19. [Auth Hook Triggers on `auth.users`](#19-auth-hook-triggers-on-authusers)
20. [`RAISE EXCEPTION` with Custom SQLSTATE](#20-raise-exception-with-custom-sqlstate)
21. [Shared Predicate Functions](#21-shared-predicate-functions)
22. [Set-Returning Functions (`RETURNS TABLE`)](#22-set-returning-functions-returns-table)
23. [`FOR ... IN` Loops and `record` Variables](#23-for--in-loops-and-record-variables)

**Query features**
24. [`DELETE ... USING` for De-duplication](#24-delete--using-for-de-duplication)
25. [JSONB Operators (`->>`, `jsonb_build_object`)](#25-jsonb-operators---jsonb_build_object)
26. [Date/Interval Arithmetic](#26-dateinterval-arithmetic)
27. [`COALESCE`, `EXISTS`, `GREATEST`](#27-coalesce-exists-greatest)

**Supabase platform**
28. [Supabase Auth (`auth.users`, JWT)](#28-supabase-auth-authusers-jwt)
29. [PostgREST Data API (supabase-js)](#29-postgrest-data-api-supabase-js)
30. [Embedded Resource Selects (Joins)](#30-embedded-resource-selects-joins)
31. [RPC Calls from the Client](#31-rpc-calls-from-the-client)
32. [`upsert` with `onConflict`](#32-upsert-with-onconflict)
33. [Range Pagination (`.range()`)](#33-range-pagination-range)
34. [Edge Functions (Deno)](#34-edge-functions-deno)
35. [Webhook Signature Verification](#35-webhook-signature-verification)
36. [Service Role vs Anon Key Separation](#36-service-role-vs-anon-key-separation)
37. [Realtime — Deliberately Disabled](#37-realtime--deliberately-disabled)
38. [Client-Side E2E Encryption Over Postgres](#38-client-side-e2e-encryption-over-postgres)

---

## 1. Row Level Security (RLS)

### How It Works
`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` turns on per-row access filtering. Once enabled, **no rows are visible or writable** unless a policy explicitly permits it. Postgres applies policies as an implicit `WHERE` clause on every query, including those coming through PostgREST.

### Why It Is Useful
- Authorization lives in the database, not in application code that can be bypassed
- A stolen anon key still cannot read another user's rows
- The same rule applies to every access path: supabase-js, PostgREST, GraphQL, SQL

### How It Is Used in This Project

**✅ Correctly used** — every table created in a migration enables RLS. There is no table with RLS left off:

```sql
-- supabase_migrations/20260224000002_add_notifications.sql
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- supabase_migrations/20260703000001_add_user_keys.sql
ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;
```

Tables with RLS enabled in migrations: `assets`, `net_worth_snapshots`, `notifications`, `notification_settings`, `transaction_splits`, `subscriptions`, `recurring_transactions`, `budgets`, `user_keys`, `user_settings`, `financial_health_scores`, `goals`, `goal_contributions`, `goal_milestones`, `promo_email_log`.

> **Note on schema coverage:** `transactions` and `categories` have no `CREATE TABLE` in `supabase_migrations/` — they predate versioned migrations and were created via the dashboard. Their RLS is configured there. Adding a baseline migration for them would make the schema fully reproducible from the repo.

---

## 2. RLS Policies with `auth.uid()`

### How It Works
`auth.uid()` is a Supabase-provided function that reads the authenticated user's ID out of the request JWT. A policy compares it to the row's `user_id`. `USING` filters which rows are *readable/affectable*; `WITH CHECK` validates rows being *written*.

### Why It Is Useful
- One expression secures an entire table for all users
- `WITH CHECK` blocks a user from inserting rows owned by someone else
- Policies compose with any query the client sends — no per-endpoint auditing needed

### How It Is Used in This Project

**✅ Correctly used** — policies specify *both* `USING` and `WITH CHECK`, which is what prevents a user from writing a row with someone else's `user_id`:

```sql
-- supabase_migrations/20260224000002_add_notifications.sql
CREATE POLICY "Users can manage their own notifications"
  ON public.notifications
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Split per-operation policies** where the operations differ — `user_keys` separates SELECT/INSERT/UPDATE/DELETE so each can be reasoned about independently:

```sql
-- supabase_migrations/20260703000001_add_user_keys.sql
CREATE POLICY "Users can view own keys"
  ON public.user_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own keys"
  ON public.user_keys FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

`auth.uid()` appears **55 times across 23 migration files**.

---

## 3. Deny-All RLS (service-role-only tables)

### How It Works
Enabling RLS and then defining *no policy at all* for `authenticated`/`anon` produces a table that those roles can never read or write. The `service_role` key bypasses RLS entirely, so server-side code still has full access.

### Why It Is Useful
- Expresses "this is server-only data" in the schema itself rather than by convention
- No policy to review, misconfigure, or accidentally loosen
- Complements the missing GRANT: two independent layers say "not for end users"

### How It Is Used in This Project

**✅ Correctly used** — the promo email log is admin-only, and the migration documents the intent:

```sql
-- supabase_migrations/20260718132009_add_promo_email_log.sql
-- RLS: this is an admin/service-only table. Enable RLS with no policies for
-- authenticated/anon (so it is never readable via the Data API by end users);
-- the Edge Function uses the service role key, which bypasses RLS.
ALTER TABLE public.promo_email_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_email_log TO service_role;
-- No grant to authenticated/anon on purpose: end users must not read the log.
```

---

## 4. Explicit Data API GRANTs

### How It Works
Postgres `GRANT` controls whether a role can touch a table *at all*. Supabase no longer auto-grants Data API access to new `public` tables (enforced on new projects from 2026-05-30, all projects from 2026-10-30). Without a grant, supabase-js calls fail with error `42501` — even when RLS would have allowed the row.

### Why It Is Useful
- Grants are the reachability layer; RLS is the row-filtering layer. Both are needed
- Omitting `anon` keeps a table entirely unreachable to logged-out visitors
- Being explicit means the schema does not silently depend on a platform default

### How It Is Used in This Project

**✅ Correctly used** — grants are explicit, role-scoped, and the reasoning is written into the migration:

```sql
-- supabase_migrations/20260703000001_add_user_keys.sql
-- RLS below is still the real access boundary; these grants only make the
-- table reachable via supabase-js/PostgREST at all. No 'anon' grant — this
-- table is only ever touched by authenticated users.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_keys TO service_role;
```

Also applied retroactively to older tables:

```sql
-- supabase_migrations/20260705055049_encrypt_amounts.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_health_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.net_worth_snapshots     TO authenticated;
```

---

## 5. SECURITY DEFINER Functions

### How It Works
A `SECURITY DEFINER` function executes with the privileges of the user who *created* it (the owner), not the caller. This lets a function read or write tables that the calling role cannot access directly — the function becomes a narrow, audited gateway.

### Why It Is Useful
- Enforce business rules the client cannot skip (limit checks, trial starts)
- Let a trigger read `subscriptions` while the inserting user has no direct access
- Encapsulate multi-table logic behind one callable name

### How It Is Used in This Project

83 occurrences across 35 migration files. Used for limit triggers, subscription status, notification checks, and account deletion:

```sql
-- supabase_migrations/20260730120000_align_limit_triggers_and_lower_free_limits.sql
CREATE OR REPLACE FUNCTION public.check_transaction_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
```

**⚠️ Caveat:** `SECURITY DEFINER` is powerful and easy to misuse — it must always be paired with a pinned `search_path` (§6) and, for client-callable functions, an identity check (§7). This project does both consistently.

---

## 6. Pinned `search_path`

### How It Works
`SET search_path = ''` (or `= public`) on a function fixes which schemas unqualified names resolve to. Without it, a caller can prepend a malicious schema to their own `search_path`, causing a `SECURITY DEFINER` function to call an attacker-controlled `transactions` table or operator — a classic privilege-escalation path.

### Why It Is Useful
- Closes the search-path hijacking attack on definer functions
- Makes the function deterministic regardless of the caller's session settings
- Supabase's linter flags unpinned definer functions as a security warning

### How It Is Used in This Project

**✅ Correctly used** — 62 occurrences across 18 files, and two migrations exist specifically to retrofit it onto every pre-existing function:

- `supabase_migrations/20260303000002_fix_function_search_path_security.sql` (12 occurrences)
- `supabase_migrations/20260303000003_fix_remaining_function_search_paths.sql` (22 occurrences)

The strictest form (`= ''`) forces every reference to be schema-qualified, which is why the newer functions spell out `public.transactions`:

```sql
-- supabase_migrations/20260730120000_align_limit_triggers_and_lower_free_limits.sql
SECURITY DEFINER
SET search_path = ''
AS $$
...
  SELECT COUNT(*) INTO monthly_count
  FROM public.transactions
  WHERE user_id = NEW.user_id
```

---

## 7. IDOR Guards Inside RPCs

### How It Works
A client-callable RPC that takes a user ID parameter is an IDOR (Insecure Direct Object Reference) risk: nothing stops a caller from passing someone else's UUID. The fix is to compare the parameter against `auth.uid()` and raise if they differ.

### Why It Is Useful
- A `SECURITY DEFINER` function bypasses RLS, so it must re-implement the ownership check itself
- Fails loudly with a distinguishable error code rather than silently returning another user's data

### How It Is Used in This Project

**✅ Correctly used** — every client-callable RPC taking `p_user_id` guards it:

```sql
-- supabase_migrations/20260321000002_add_card_free_trial.sql
CREATE OR REPLACE FUNCTION start_free_trial(p_user_id UUID)
...
BEGIN
  -- Only allow users to start their own trial
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0003';
  END IF;
```

```sql
-- same file, get_subscription_status
    -- Prevent users from querying other users' subscription status
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: cannot access another user''s subscription'
            USING ERRCODE = 'P0003';
    END IF;
```

The migration `fix_subscription_security_and_limits.sql` was written specifically to add these ("RPC functions now validate caller identity (prevent IDOR)").

---

## 8. REVOKE on Internal Helpers

### How It Works
`REVOKE ALL ON FUNCTION ... FROM PUBLIC` removes the default execute grant Postgres gives every role, so only explicitly granted roles can call the function.

### Why It Is Useful
- A `SECURITY DEFINER` helper that takes an arbitrary user ID must never be client-reachable
- Least privilege: triggers run as the definer and don't need a client-facing grant

### How It Is Used in This Project

**✅ Correctly used** — the shared premium predicate is deliberately locked away from clients, with the reason in a comment:

```sql
-- supabase_migrations/20260730120000_align_limit_triggers_and_lower_free_limits.sql
-- SECURITY DEFINER + takes an explicit user id, so do NOT expose it to clients:
-- only the limit triggers (which run as definer) need it.
REVOKE ALL ON FUNCTION public.user_has_premium_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_premium_access(UUID) TO service_role;
```

Contrast with genuinely client-facing RPCs, which are granted narrowly to `authenticated`:

```sql
GRANT EXECUTE ON FUNCTION get_subscription_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION seed_default_categories_for_user(UUID) TO service_role, postgres;
```

---

## 9. UUID Primary Keys with `gen_random_uuid()`

### How It Works
`uuid DEFAULT gen_random_uuid() PRIMARY KEY` generates a random 128-bit identifier server-side (via pgcrypto, built into modern Postgres).

### Why It Is Useful
- IDs are not guessable or enumerable — you cannot walk `/goal/1`, `/goal/2`
- No coordination needed to generate IDs; safe for offline/optimistic creation
- Matches `auth.users.id`, so foreign keys line up naturally

### How It Is Used in This Project

```sql
-- supabase_migrations/20260224000002_add_notifications.sql
id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

-- supabase_migrations/20260703000001_add_user_keys.sql — user_id IS the PK (1:1 with the user)
user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
```

**✅ Correctly used:** `user_keys` uses `user_id` *as* the primary key rather than adding a surrogate `id`. That makes "one key row per user" a structural guarantee instead of something a UNIQUE constraint has to enforce separately.

---

## 10. Foreign Keys with `ON DELETE CASCADE`

### How It Works
A foreign key ties a column to another table's primary key. `ON DELETE CASCADE` tells Postgres to delete dependent rows automatically when the parent is deleted.

### Why It Is Useful
- Deleting a user removes all their data with no application code — GDPR erasure becomes structural
- Prevents orphan rows that would otherwise accumulate invisibly
- Referential integrity is enforced even for writes that bypass the app

### How It Is Used in This Project

**✅ Correctly used** — every user-owned table cascades from `auth.users`:

```sql
-- supabase_migrations/20260224000002_add_notifications.sql
user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

-- supabase_migrations/20260718132009_add_promo_email_log.sql
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
```

There is also a purpose-built cascade for a non-FK relationship — deleting a transaction removes the goal contribution it funded:

```sql
-- supabase_migrations/20260410000002_cascade_delete_contribution_on_transaction_delete.sql
CREATE TRIGGER trigger_delete_contribution_on_transaction_delete
```

---

## 11. CHECK Constraints

### How It Works
A `CHECK` constraint is a boolean expression evaluated on every insert and update. If it returns false, the write is rejected. It runs regardless of which client or role performs the write.

### Why It Is Useful
- Enum-like validation without a separate type or lookup table
- Range validation the UI cannot skip — the database is the last line of defense
- Self-documenting: the set of legal values is visible in the schema

### How It Is Used in This Project

**✅ Correctly used** — validation is duplicated in the DB rather than trusted to the client:

```sql
-- supabase_migrations/20260224000002_add_notifications.sql
notification_type text NOT NULL CHECK (
  notification_type IN ('budget_overrun', 'recurring_due', 'goal_milestone', 'trial_expiring', 'general')
),
budget_threshold integer DEFAULT 90 CHECK (budget_threshold BETWEEN 50 AND 100),
recurring_advance_days integer DEFAULT 1 CHECK (recurring_advance_days BETWEEN 0 AND 7),
goal_milestone_percentage integer DEFAULT 25 CHECK (goal_milestone_percentage BETWEEN 10 AND 50),
```

```sql
-- supabase_migrations/20260703000001_add_user_keys.sql — state machine as a constraint
encryption_status text NOT NULL DEFAULT 'migrating'
                  CHECK (encryption_status IN ('migrating', 'enabled', 'disabling')),
```

Two later migrations (`20260707140000_relax_budget_threshold_check.sql`, `20260708120000_relax_goal_milestone_check.sql`) *relax* these bounds — a good reminder that CHECK constraints on user-tunable settings need loosening as product requirements change, and that doing so via migration keeps the history auditable.

---

## 12. UNIQUE Constraints

### How It Works
`UNIQUE` (single-column or composite) creates an index that rejects duplicate values. It is enforced atomically, so it holds even under concurrent inserts.

### Why It Is Useful
- Idempotency guarantee that no application-level check can match — two simultaneous requests cannot both win
- Makes "send once per user per campaign" a structural property
- `UNIQUE` on a FK column expresses a 1:1 relationship

### How It Is Used in This Project

**✅ Correctly used** — the promo email de-dup is enforced by the schema, not by a read-then-write race:

```sql
-- supabase_migrations/20260718132009_add_promo_email_log.sql
    -- one row per user per campaign; a re-run cannot insert a duplicate
    UNIQUE (user_id, campaign)
```

```sql
-- supabase_migrations/20260224000002_add_notifications.sql — one settings row per user
user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
```

---

## 13. Partial Unique Indexes

### How It Works
`CREATE UNIQUE INDEX ... WHERE <predicate>` enforces uniqueness only over the subset of rows matching the predicate. Rows outside it are unconstrained and are not stored in the index.

### Why It Is Useful
- Enforce a rule that applies to only some rows (here: only auto-generated transactions)
- Smaller index than a full one — faster and cheaper
- Expresses "NULLs are exempt" precisely, which plain UNIQUE cannot do cleanly

### How It Is Used in This Project

**✅ Correctly used** — this is the fix for duplicate recurring instances created by concurrent client-side generation. Manual transactions (with `source_recurring_id IS NULL`) are deliberately exempt:

```sql
-- supabase_migrations/20260529000001_dedupe_and_unique_recurring_instances.sql
-- Step B: Partial unique index — manual transactions (NULL source_recurring_id) unaffected
CREATE UNIQUE INDEX IF NOT EXISTS uniq_tx_recurring_date
  ON transactions (source_recurring_id, date)
  WHERE source_recurring_id IS NOT NULL;
```

This turns a race condition into a constraint violation, which is the right way to fix a concurrency bug — the guarantee no longer depends on client timing.

---

## 14. Composite & Partial Indexes

### How It Works
A composite index covers multiple columns in order and can serve queries filtering on a prefix of them; adding `DESC` matches a descending `ORDER BY`. A partial index (`WHERE ...`) indexes only matching rows.

### Why It Is Useful
- One index serves both the filter and the sort, avoiding a separate sort step
- Partial indexes stay small when the interesting rows are a minority (e.g. unread notifications)
- Indexes on FK columns prevent slow scans during cascading deletes and joins

### How It Is Used in This Project

**✅ Correctly used** — the notifications indexes match the two real query shapes exactly (recent-first list; unread badge count):

```sql
-- supabase_migrations/20260224000002_add_notifications.sql
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
```

29 `CREATE INDEX` statements exist across the migrations, covering `user_id` on every user-owned table plus query-specific composites:

```sql
-- supabase_migrations/add_monthly_budgets.sql
CREATE INDEX IF NOT EXISTS idx_budgets_user_year_month ...
-- supabase_migrations/add_financial_goals.sql
CREATE INDEX IF NOT EXISTS idx_goals_active_completed ...
-- supabase_migrations/add_recurring_transactions.sql
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_next_run_at ...
```

---

## 15. JSONB Columns

### How It Works
`jsonb` stores JSON in a decomposed binary format. It supports indexing, and operators like `->` (get JSON), `->>` (get text), and `@>` (contains). Unlike `json`, it normalizes and deduplicates keys.

### Why It Is Useful
- Schema-flexible fields (notification metadata, migration cursors) without a table per shape
- Queryable — you can filter on a nested key without parsing in application code
- Ideal for data whose shape varies by row type

### How It Is Used in This Project

**Notification metadata** — routing and dedup keys, with a documented rule that amounts never go here (they are E2E-encrypted):

```sql
-- supabase_migrations/20260224000002_add_notifications.sql
metadata jsonb DEFAULT '{}',
```

**Resumable migration cursor and retired key history** — both are genuinely variable-shape data, a textbook fit for JSONB:

```sql
-- supabase_migrations/20260703000001_add_user_keys.sql
  -- per-table resume cursor for the lazy client-side migration, e.g.
  -- {"transactions": "<last uuid>", "goals": "done"}
  migration_cursor      jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous_keys         jsonb NOT NULL DEFAULT '[]'::jsonb,
```

**✅ Correctly used:** note `NOT NULL DEFAULT '{}'::jsonb` — defaulting to an empty object rather than allowing NULL removes an entire class of null-handling from the client.

---

## 16. `timestamptz` and `now()` Defaults

### How It Works
`timestamptz` stores an absolute instant, converting to/from UTC on the way in and out. `DEFAULT now()` stamps the value server-side at insert time.

### Why It Is Useful
- No timezone ambiguity across users, servers, and browsers
- Server-set timestamps cannot be forged or skewed by a wrong client clock
- Directly comparable with interval arithmetic (`now() - interval '3 days'`)

### How It Is Used in This Project

```sql
-- supabase_migrations/20260224000002_add_notifications.sql
created_at timestamptz DEFAULT now() NOT NULL

-- supabase_migrations/20260718132009_add_promo_email_log.sql
sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
```

**⚠️ Caveat:** `updated_at` is maintained by a trigger on most tables (§18) but is set by the *client* for goals — `src/utils/api/goals.js:92` sends `updated_at: new Date().toISOString()`. That value comes from the user's clock and can be wrong. Moving it to a trigger would make it consistent with `assets`, `user_keys`, `user_settings`, and `notification_settings`.

---

## 17. PL/pgSQL Functions

### How It Works
PL/pgSQL is Postgres's procedural language: variables (`DECLARE`), control flow (`IF`, `LOOP`), and exceptions inside the database. Functions are compiled and cached, and run in the same process as the query — no network round-trip.

### Why It Is Useful
- Multi-step logic executes atomically, close to the data
- Enforces rules no client can skip, including direct SQL access
- One round-trip instead of several read-modify-write cycles from the browser

### How It Is Used in This Project

Used for limit enforcement, subscription status, seeding, and notification generation:

```sql
-- supabase_migrations/20260730120000_align_limit_triggers_and_lower_free_limits.sql
CREATE OR REPLACE FUNCTION public.check_goal_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  active_count INTEGER;
  free_limit CONSTANT INTEGER := 10;
BEGIN
  IF public.user_has_premium_access(NEW.user_id) THEN
    RETURN NEW;
  END IF;
  ...
```

**✅ Correctly used:** `free_limit CONSTANT INTEGER := 10` names the magic number instead of inlining it in the comparison — the limit is visible at the top of the function.

Note the plain-SQL alternative where no procedural logic is needed — `LANGUAGE sql STABLE` lets the planner inline the function:

```sql
CREATE OR REPLACE FUNCTION public.user_has_premium_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
```

---

## 18. Triggers (BEFORE INSERT / BEFORE UPDATE)

### How It Works
A trigger binds a function to a table event. `BEFORE INSERT` runs before the row is written and can reject it by raising; `BEFORE UPDATE` can modify `NEW` before it is stored. `FOR EACH ROW` fires once per affected row.

### Why It Is Useful
- Invariants hold no matter which code path writes — REST, SQL, another service
- `BEFORE UPDATE` is the correct place for `updated_at`: impossible to forget, impossible to spoof
- Business rules stay attached to the data rather than scattered across callers

### How It Is Used in This Project

**Freemium limit enforcement** — the write-path counterpart to the client's `canCreate*` checks:

```sql
-- supabase_migrations/20260730120000_align_limit_triggers_and_lower_free_limits.sql
DROP TRIGGER IF EXISTS enforce_transaction_limit ON public.transactions;
CREATE TRIGGER enforce_transaction_limit
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.check_transaction_limit();
```

Four such triggers exist: `enforce_transaction_limit`, `enforce_budget_limit`, `enforce_goal_limit`, `enforce_recurring_limit`.

**`updated_at` maintenance**:

```sql
-- supabase_migrations/20260703000001_add_user_keys.sql
CREATE TRIGGER trigger_user_keys_updated_at
  BEFORE UPDATE ON public.user_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_keys_updated_at();
```

**✅ Correctly used:** the `DROP TRIGGER IF EXISTS` before every `CREATE TRIGGER` makes migrations idempotent and re-runnable — important because several migrations redefine the same trigger as limits change.

---

## 19. Auth Hook Triggers on `auth.users`

### How It Works
Supabase's `auth.users` table is a normal Postgres table, so you can attach `AFTER INSERT` triggers to it. This runs your provisioning logic inside the same transaction as the signup.

### Why It Is Useful
- New users get their dependent rows atomically — no "signed up but has no subscription row" state
- Works for every signup path (email, OAuth, admin API) with no client involvement
- Replaces a fragile client-side "create my defaults" call

### How It Is Used in This Project

```sql
-- supabase_migrations/20260303000003_fix_remaining_function_search_paths.sql
CREATE TRIGGER on_auth_user_created_categories
CREATE TRIGGER on_auth_user_created_subscription

-- supabase_migrations/20260731090000_add_user_settings_preferred_currency.sql
CREATE TRIGGER trg_create_user_settings
```

Every new user therefore starts with default categories, a `subscriptions` row, and a `user_settings` row already present.

---

## 20. `RAISE EXCEPTION` with Custom SQLSTATE

### How It Works
`RAISE EXCEPTION '...' USING ERRCODE = 'P0001'` aborts the transaction and returns a specific SQLSTATE code. PostgREST forwards it to the client, where supabase-js exposes it as `error.code`.

### Why It Is Useful
- The client can branch on a stable code rather than string-matching an error message
- Distinguishes "limit reached" (show upgrade prompt) from a genuine failure (show error toast)
- Message text can change or be localized without breaking client logic

### How It Is Used in This Project

```sql
-- supabase_migrations/20260730120000_align_limit_triggers_and_lower_free_limits.sql
  IF monthly_count >= free_limit THEN
    RAISE EXCEPTION 'Monthly transaction limit reached. Upgrade to premium for unlimited transactions.'
      USING ERRCODE = 'P0001';
```

Distinct codes carry distinct meanings: `P0001` limit reached, `P0003` unauthorized, `P0004` trial already used, `P0005` already subscribed.

**✅ Correctly used** — the client consumes the code, not the message:

```js
// src/context/TransactionContext.jsx
if (e?.code === 'P0001' || e?.message?.includes('transaction limit')) {
  addToast(t('upgrade.transactionLimitReached'), 'warning');
}
```

---

## 21. Shared Predicate Functions

### How It Works
A single function encapsulates a rule that multiple call sites need, so the rule has exactly one definition. Marking it `STABLE` tells the planner the result won't change within a statement, enabling optimization.

### Why It Is Useful
- Prevents the read path and the write path from drifting apart
- Changing the rule means editing one function, not N copies
- The name documents the concept ("premium access") better than an inlined boolean expression

### How It Is Used in This Project

**✅ Correctly used — this is the single best pattern in the schema.** The read path (`get_subscription_status`) and the write path (four limit triggers) used to encode "is this user premium?" separately, and the write path **failed open** for lapsed trials and expired subscriptions. The fix was one shared predicate:

```sql
-- supabase_migrations/20260730120000_align_limit_triggers_and_lower_free_limits.sql
CREATE OR REPLACE FUNCTION public.user_has_premium_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND (
        (s.status = 'active'   AND (s.current_period_end IS NULL OR s.current_period_end > NOW()))
        OR (s.status = 'trialing' AND (s.trial_end IS NULL OR s.trial_end > NOW()))
        OR (s.status IN ('past_due', 'cancelled')
            AND s.current_period_end IS NOT NULL AND s.current_period_end > NOW())
      )
  );
$$;

COMMENT ON FUNCTION public.user_has_premium_access(UUID) IS
  'Single source of truth for premium access on the WRITE path. Must stay in '
  'sync with the is_premium expression in get_subscription_status.';
```

Two details worth copying: **every branch is date-bounded** (a stale `status` string alone never grants access), and `COMMENT ON FUNCTION` records the invariant in the database itself, where the next person to edit it will see it.

---

## 22. Set-Returning Functions (`RETURNS TABLE`)

### How It Works
`RETURNS TABLE (col type, ...)` declares a function returning rows with a named, typed shape. `RETURN QUERY` streams the result of a query as the return value.

### Why It Is Useful
- Ships computed fields (`is_premium`, `trial_days_left`) that no column stores
- One round-trip replaces fetching raw columns and recomputing in JavaScript
- The computation is authoritative — the client cannot disagree with it

### How It Is Used in This Project

```sql
-- supabase_migrations/20260321000002_add_card_free_trial.sql
CREATE OR REPLACE FUNCTION get_subscription_status(p_user_id UUID)
RETURNS TABLE (
    subscription_status TEXT,
    subscription_plan TEXT,
    is_premium BOOLEAN,
    is_trialing BOOLEAN,
    trial_days_left INTEGER,
    period_end TIMESTAMPTZ,
    ...
)
```

**✅ Correctly used** — `is_premium` is *derived in SQL* and simply read by React, rather than being recomputed from raw status/date columns in the client:

```js
// src/context/SubscriptionContext.jsx
const isPremium = useMemo(() => {
  if (!subscription) return false;
  return subscription.is_premium === true;
}, [subscription]);
```

---

## 23. `FOR ... IN` Loops and `record` Variables

### How It Works
PL/pgSQL can iterate a query's results with `FOR var IN SELECT ...  LOOP`, where `var` is a `record` holding each row. `SELECT ... INTO` assigns a single row or scalar to variables, and `FOUND` reports whether it matched.

### Why It Is Useful
- Per-row logic that pure SQL cannot express (branching, conditional side effects)
- `IF NOT FOUND THEN RETURN` is a clean guard for missing configuration rows

### How It Is Used in This Project

The original server-side budget notification check (since superseded — see §38):

```sql
-- supabase_migrations/20260224000002_add_notifications.sql
DECLARE
  v_settings record;
  v_budget record;
BEGIN
  SELECT * INTO v_settings FROM public.notification_settings WHERE user_id = p_user_id;
  IF NOT FOUND OR NOT v_settings.budget_overrun_enabled THEN
    RETURN;
  END IF;
  ...
  FOR v_budget IN
    SELECT b.id, b.category_id, b.amount as budget_amount, c.name as category_name
    FROM public.monthly_budgets b
    JOIN public.categories c ON c.id = b.category_id
    WHERE b.user_id = p_user_id AND b.month = v_current_month
  LOOP
```

---

## 24. `DELETE ... USING` for De-duplication

### How It Works
`DELETE FROM t USING t2 WHERE <join condition>` performs a self-join in a delete, letting you keep one row per group by comparing IDs (`t.id > t2.id` deletes all but the lowest).

### Why It Is Useful
- Cleans up existing duplicates in one statement, no cursor or temp table
- The canonical prerequisite to adding a unique index to a table that already has duplicates

### How It Is Used in This Project

**✅ Correctly used** — clean up first, then constrain, in a single migration so the two can never be out of sync:

```sql
-- supabase_migrations/20260529000001_dedupe_and_unique_recurring_instances.sql
-- Step A: De-duplicate existing rows, keep lowest id per (source_recurring_id, date)
DELETE FROM transactions t
USING transactions t2
WHERE t.source_recurring_id IS NOT NULL
  AND t.source_recurring_id = t2.source_recurring_id
  AND t.date = t2.date
  AND t.id > t2.id;
```

The same migration then adds the partial unique index from §13 to prevent recurrence.

---

## 25. JSONB Operators (`->>`, `jsonb_build_object`)

### How It Works
`->>` extracts a JSON field as `text`; `->` extracts it as `jsonb`. `jsonb_build_object(k, v, ...)` constructs a JSONB value from alternating keys and values.

### Why It Is Useful
- Query and filter on nested keys directly in SQL
- Build structured metadata inline without string-concatenating JSON

### How It Is Used in This Project

**Filtering on a nested key** for notification dedup:

```sql
-- supabase_migrations/20260224000002_add_notifications.sql
        WHERE user_id = p_user_id
          AND notification_type = 'budget_overrun'
          AND (metadata->>'category_id') = v_budget.category_id::text
          AND (metadata->>'month') = v_current_month
          AND created_at > now() - interval '3 days'
```

The same operator is used from the client through PostgREST, showing the operator surface is available in both places:

```js
// src/utils/finance/notify.js
for (const [k, v] of Object.entries(dedup)) {
  query = query.eq(`metadata->>${k}`, String(v));
}
```

**Building nested metadata**:

```sql
jsonb_build_object(
  'category_id', v_budget.category_id,
  'month', v_current_month,
  'message_params', jsonb_build_object('category', v_budget.category_name, ...)
)
```

---

## 26. Date/Interval Arithmetic

### How It Works
Postgres has first-class `interval` arithmetic: `now() - interval '3 days'`, `date_trunc('month', CURRENT_DATE)`, and casts like `::DATE`. `to_char(date, 'YYYY-MM')` formats a date into a month key.

### Why It Is Useful
- Correct month boundaries including leap years and DST, computed server-side
- Half-open ranges (`>= start AND < next_month`) avoid the end-of-month off-by-one bug
- Server-evaluated windows can't be manipulated by a wrong client clock

### How It Is Used in This Project

**✅ Correctly used** — the monthly transaction count uses a half-open range on `date_trunc`, which is the safe formulation:

```sql
-- supabase_migrations/20260730120000_align_limit_triggers_and_lower_free_limits.sql
  SELECT COUNT(*) INTO monthly_count
  FROM public.transactions
  WHERE user_id = NEW.user_id
    AND date >= date_trunc('month', CURRENT_DATE)::DATE
    AND date <  (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::DATE;
```

**Trial windows and dedup windows**:

```sql
-- supabase_migrations/20260321000002_add_card_free_trial.sql
    trial_end = NOW() + INTERVAL '7 days',

-- supabase_migrations/20260224000002_add_notifications.sql
          AND created_at > now() - interval '3 days'
```

A dedicated migration exists for a date bug this class of code invites: `20260225000003_fix_trial_days_off_by_one.sql`.

---

## 27. `COALESCE`, `EXISTS`, `GREATEST`

### How It Works
- `COALESCE(a, b)` returns the first non-NULL argument
- `EXISTS (SELECT 1 ...)` is a boolean subquery that short-circuits on the first matching row
- `GREATEST(a, b)` returns the larger value

### Why It Is Useful
- `COALESCE(SUM(x), 0)` turns "no rows" into `0` instead of NULL, so arithmetic downstream is safe
- `EXISTS` is faster than `COUNT(*) > 0` — it stops at the first hit
- `GREATEST(0, ...)` clamps a value without a `CASE`

### How It Is Used in This Project

```sql
-- supabase_migrations/20260224000002_add_notifications.sql
    SELECT COALESCE(SUM(base_amount), 0) INTO v_spent

-- supabase_migrations/20260730120000_align_limit_triggers_and_lower_free_limits.sql
  SELECT EXISTS ( SELECT 1 FROM public.subscriptions s WHERE ... );

-- supabase_migrations/20260321000002_add_card_free_trial.sql
        CASE WHEN s.trial_end IS NOT NULL AND s.trial_end > NOW()
            THEN GREATEST(0, (DATE(s.trial_end AT TIME ZONE 'UTC') - CURRENT_DATE)::INTEGER)
            ELSE 0
        END AS trial_days_left,
```

---

## 28. Supabase Auth (`auth.users`, JWT)

### How It Works
Supabase Auth manages users in the `auth` schema and issues JWTs. The token travels with every request; Postgres exposes its claims via `auth.uid()` and `auth.jwt()`. `user_metadata` stores arbitrary per-user JSON on the token.

### Why It Is Useful
- One identity works across the Data API, RPCs, and Edge Functions
- `user_metadata` carries small flags (language, onboarding state) without an extra query
- Auto-refresh keeps long sessions alive transparently

### How It Is Used in This Project

```js
// src/utils/supabaseClient.js
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
```

**`user_metadata` for routing decisions**:

```js
// src/App.jsx — PrivateRoute
if (!user?.user_metadata?.onboarding_completed) return <Navigate to="/onboarding" replace />;
```

**✅ Correctly used** — the API layer reads the session from local cache instead of making a network call per request, with the reason documented:

```js
// src/utils/api/_auth.js
export async function withAuth(fn) {
  const supabase = await getSupabase();
  // getSession() reads from local cache — no HTTP round-trip per call.
  // getUser() makes a network request every time and causes 429s under load.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Please log in to perform this action');
  return fn(user);
}
```

Note the layering: `withAuth` is a *convenience and UX* guard (fail fast with a clear message), while RLS is the actual security boundary. The client-side check is not trusted.

---

## 29. PostgREST Data API (supabase-js)

### How It Works
Supabase exposes every table through PostgREST as a REST API. supabase-js builds queries with a chainable builder — `.select()`, `.eq()`, `.gte()`, `.in()`, `.order()`, `.limit()` — which compiles to a URL, executed under the caller's JWT and RLS.

### Why It Is Useful
- No backend endpoints to write for standard CRUD
- Filtering and sorting happen in Postgres, so only needed rows cross the wire
- The same query surface works from any client

### How It Is Used in This Project

```js
// src/utils/finance/budgetAlerts.js
  const { data: txRaw, error: tErr } = await supabase
    .from('transactions')
    .select('id, category_id, amount, base_amount, exchange_rate, has_splits, type')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .gte('date', startDate)
    .lt('date', endDate);
```

**✅ Correctly used** — an explicit column list rather than `select('*')`, and a batched `.in()` lookup instead of one query per transaction:

```js
// src/utils/api/transactions.js — fetchSplitsForTransactions
    .select('id, transaction_id, category_id, amount, category:categories(id, name)')
    .eq('user_id', user.id)
    .in('transaction_id', ids);
```

The doc comment above that function explains the N+1 it avoids: *"Fetching them per row would be one request per split transaction; this is a single `in` query."*

**⚠️ Caveat:** `select('*')` still appears in ~14 places (`categories.js`, `networth.js`, `notifications.js`, and others). Narrowing those to explicit column lists reduces payload size and avoids silently pulling in new columns as the schema grows.

---

## 30. Embedded Resource Selects (Joins)

### How It Works
PostgREST follows foreign keys: `category:categories(id, name)` embeds the related row under the alias `category` in a single request. The relationship is inferred from the FK.

### Why It Is Useful
- One round-trip instead of a query per related row (the classic N+1)
- The join happens in Postgres, which is far better at it than a JavaScript loop
- Aliasing gives the embedded object a clean name in the response

### How It Is Used in This Project

```js
// src/utils/api/transactions.js
      .select(`
        *,
        source_recurring_id,
        category:categories(id, name),
        recurring:source_recurring_id(start_date, last_run_at)
      `)
```

**⚠️ Known gotcha (documented in CLAUDE.md):** embedding through a column *drops the scalar of the same name*. Because `recurring:source_recurring_id(...)` occupies that key, `source_recurring_id` must be listed explicitly as well — which the query above does. This is easy to miss and produces a confusing "the ID is suddenly undefined" bug.

---

## 31. RPC Calls from the Client

### How It Works
`supabase.rpc('function_name', { args })` invokes a Postgres function through PostgREST. The function runs under the caller's JWT, so `auth.uid()` is populated and any `SECURITY DEFINER` logic applies.

### Why It Is Useful
- Encapsulates multi-step or privileged logic behind one call
- Returns computed values that no column stores
- Keeps authoritative business rules in the database

### How It Is Used in This Project

```js
// src/utils/api/subscriptions.js
export async function fetchSubscription() {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .rpc('get_subscription_status', { p_user_id: user.id });
    ...
    return data?.[0] || null;
  });
}
```

Client-callable RPCs in use: `get_subscription_status`, `get_monthly_transaction_count`, `start_free_trial`, `check_trial_expiring_notifications`.

**✅ Correctly used** — a not-yet-deployed function degrades gracefully instead of crashing the app:

```js
    if (error) {
      if (error.code === '42883' || error.message?.includes('does not exist')) {
        console.warn('Subscription functions not yet deployed.');
        return null;
      }
      throw error;
    }
```

**⚠️ Caveat:** `src/utils/api/transactions.js:406` still calls `supabase.rpc('check_budget_notifications', ...)`, but that function was dropped in `20260705055049_encrypt_amounts.sql` when amounts became encrypted. Since `.rpc()` returns `{ error }` rather than throwing, the surrounding `try/catch` never fires and the failure is silent. Every other write path correctly calls the client-side port `checkBudgetNotifications()` from `src/utils/finance/budgetAlerts.js`.

---

## 32. `upsert` with `onConflict`

### How It Works
`INSERT ... ON CONFLICT (cols) DO UPDATE` inserts a row, or updates it if a unique constraint is violated. supabase-js exposes this as `.upsert(data, { onConflict: 'col' })`.

### Why It Is Useful
- Idempotent writes — retrying is safe, which matters for webhooks
- One atomic statement instead of a racy select-then-insert-or-update
- Handles "first event may arrive out of order" without special-casing

### How It Is Used in This Project

```ts
// supabase/functions/paddle-webhook/index.ts — subscription.created
        const { error } = await supabase
          .from("subscriptions")
          .upsert(upsertData, { onConflict: "user_id" });
```

---

## 33. Range Pagination (`.range()`)

### How It Works
`.range(from, to)` maps to an HTTP `Range` header, which PostgREST turns into `LIMIT`/`OFFSET`. Supabase caps a single response at 1000 rows by default, so larger sets must be paged.

### Why It Is Useful
- Avoids silent truncation at the row cap
- Bounded memory per response

### How It Is Used in This Project

```js
// src/utils/api/transactions.js
    const PAGE_SIZE = 1000;
    ...
        .range(from, from + PAGE_SIZE - 1);
      ...
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
```

**⚠️ Caveat:** this loop fetches the user's *entire* transaction history on every dashboard mount, then decrypts all of it client-side. Correct, but the cost grows without bound. A date-bounded default window (with paging reserved for explicit "load all" actions like export) would scale better.

---

## 34. Edge Functions (Deno)

### How It Works
Supabase Edge Functions are Deno-runtime TypeScript functions deployed to the edge. They import via URL, read config from `Deno.env`, and can use the service-role key to bypass RLS.

### Why It Is Useful
- Somewhere to hold secrets that must never reach the browser (Paddle API key, Resend key)
- Receives third-party webhooks, which need a public HTTPS endpoint
- Server-side privileged operations (user deletion, bulk email)

### How It Is Used in This Project

Ten functions in `supabase/functions/`: `paddle-webhook`, `get-customer-portal`, `delete-user`, `send-confirmation-email`, `send-reengagement-bulk`, `send-reengagement-test`, `send-bulk-notification`, `send-bulk-notification-test`, `send-failed-payment`, `send-yearly-promo`.

**✅ Correctly used — `delete-user` verifies the caller before doing privileged work.** It uses an *anon* client bound to the caller's JWT to establish identity, then switches to the admin client only for the work that requires it:

```ts
// supabase/functions/delete-user/index.ts
    // Use the anon client + user JWT to confirm the token is valid and get the user id
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 401, ... });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
```

It also cancels the Paddle subscription *before* deleting data, so a failure can't strand a paying subscription with no record of it.

**⚠️ Caveat:** the four bulk-email functions (`send-bulk-notification`, `send-yearly-promo`, `send-reengagement-bulk`, `send-failed-payment`) do **not** perform this caller check — they go straight from request to service-role client. Since the anon key ships in the browser bundle and satisfies the gateway's default JWT check, any visitor could invoke them. They should adopt the `delete-user` pattern or require a shared admin secret.

**Pagination in bulk sends** — `send-yearly-promo` pages through all users, which `send-bulk-notification` does not (it calls bare `listUsers()` and silently stops at the first 50):

```ts
// supabase/functions/send-yearly-promo/index.ts
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      ...
      if (data.users.length < 1000) break;
      page++;
    }
```

---

## 35. Webhook Signature Verification

### How It Works
Paddle signs each webhook as `ts=TIMESTAMP;h1=HMAC_SHA256(ts:body, secret)`. The receiver recomputes the HMAC over the **raw** body and compares. A timestamp check bounds replay attacks.

### Why It Is Useful
- Without it, anyone who learns the URL can forge billing events and grant themselves premium
- Constant-time comparison prevents leaking the expected signature via timing
- The freshness window stops replay of a captured valid request

### How It Is Used in This Project

**✅ Correctly used — a model implementation.** Verification happens before parsing, uses the raw body, rejects stale timestamps, and compares in constant time:

```ts
// supabase/functions/paddle-webhook/index.ts
  // Reject timestamps older than 5 minutes to prevent replay attacks
  const timestampAge = Math.abs(Date.now() / 1000 - parseInt(ts, 10));
  if (isNaN(timestampAge) || timestampAge > 300) return false;

  // Reconstruct signed payload: ts:rawBody
  const signedPayload = `${ts}:${rawBody}`;
```

```ts
/** Constant-time string comparison to prevent timing attacks */
function timingSafeEqual(a: string, b: string): boolean {
  ...
  let result = bufA.length ^ bufB.length; // non-zero if lengths differ
  for (let i = 0; i < maxLen; i++) {
    result |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return result === 0;
}
```

Two more things it gets right: it **fails closed** if the secret is missing (returns 500 rather than skipping verification), and it validates `user_id` against a UUID regex before using it in a query.

**Idempotency** is handled via a stored `last_event_id`:

```ts
    if (existing?.last_event_id === eventId) {
      console.log(`Event ${eventId} already processed, skipping`);
```

**⚠️ Caveat:** that is a single-slot check — it only recognizes the *most recent* event. A re-delivery of an older event still applies, and there is no `occurred_at` comparison to reject out-of-order events. A dedicated `webhook_events` table (also giving you the raw payload for reconciliation) would close both gaps.

---

## 36. Service Role vs Anon Key Separation

### How It Works
The **anon key** is public, ships to browsers, and is always constrained by RLS. The **service-role key** bypasses RLS entirely and must never leave the server. Supabase injects `SUPABASE_SERVICE_ROLE_KEY` into Edge Functions from secrets.

### Why It Is Useful
- Leaking the service key means total data compromise, so its blast radius must stay server-side
- Vite only exposes `VITE_`-prefixed vars, giving a mechanical guard against accidental client bundling

### How It Is Used in This Project

**✅ Correctly used** — the split is clean, verified by comparing client and server env references:

Client (`import.meta.env`, all `VITE_`-prefixed, all safe to publish):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PADDLE_CLIENT_TOKEN`, `VITE_PADDLE_ENVIRONMENT`, `VITE_PADDLE_YEARLY_PRICE_ID`, `VITE_E2EE_ENABLED`

Server only (`Deno.env.get`, never `VITE_`-prefixed):
`SUPABASE_SERVICE_ROLE_KEY`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `APP_BASE_URL`

**No secret appears on both sides.** The service-role key is referenced only in `paddle-webhook`, `delete-user`, `send-reengagement-bulk`, `send-bulk-notification`, and `send-yearly-promo` — all Edge Functions.

---

## 37. Realtime — Deliberately Disabled

### How It Works
Supabase Realtime streams Postgres changes over WebSockets via `supabase.channel(...).on('postgres_changes', ...)`. It is opt-in per client.

### Why It Matters Here
This project **does not use Realtime**, and disconnects it explicitly at client creation:

```js
// src/utils/supabaseClient.js
// App does not use Realtime subscriptions. Disconnect immediately to prevent
// the WebSocket from opening and causing 429 rate-limit errors in the console.
supabase.realtime.disconnect();
```

**✅ Correctly used (as a deliberate non-use):** the alternative — a plain in-tab event bus — is simpler and synchronous for the one case that needs it (the sidebar unread badge):

```js
// src/utils/finance/notify.js
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('notifications:changed'));
  }
```

Realtime would be the natural upgrade if the app ever needs cross-device/cross-tab live sync; today it would only add a WebSocket and rate-limit pressure for no user-visible gain.

---

## 38. Client-Side E2E Encryption Over Postgres

### How It Works
Sensitive fields are encrypted in the browser (AES-GCM, key derived via PBKDF2) and stored as ciphertext `text`. The server holds only the wrapped key blobs in `user_keys` and never sees plaintext or key material.

### Why It Is Useful
- A database compromise yields ciphertext, not financial data
- Strong privacy guarantee that is a genuine product differentiator
- The wrapped-key design lets the user recover data with a recovery code

### How It Is Used in This Project

The tradeoff is architectural: **the database can no longer read the values it stores**, so every aggregation, comparison, and notification that touched an amount had to move client-side. `20260705055049_encrypt_amounts.sql` drops all of them:

```sql
-- supabase_migrations/20260705055049_encrypt_amounts.sql
DROP FUNCTION IF EXISTS public.update_goal_current_amount()          CASCADE;
DROP FUNCTION IF EXISTS public.check_budget_notifications(uuid)       CASCADE;
DROP FUNCTION IF EXISTS public.get_financial_health_score(uuid, date, boolean) CASCADE;
```

Their replacements live in `src/utils/finance/` (`budgetAlerts.js`, `goalProgress.js`, `healthScore.js`, `recurringAlerts.js`).

**✅ Correctly used** — the schema keeps a clean line between what may be plaintext and what may not. Dedup/routing keys stay queryable in `metadata`; amounts never do:

```js
// src/utils/finance/notify.js
//   - title/message are rendered NOW (current i18n language) and stored
//     ENCRYPTED via encryptRow (notifications is in FIELD_MAP).
//   - metadata carries only non-sensitive routing/dedup keys (ids, month,
//     due_date, milestone_pct) — never amounts.
```

**Resumable migration state** lives in Postgres so encrypting an existing account can be interrupted and resumed (§15's `migration_cursor`), and the client uses the **Web Locks API** so two open tabs don't migrate simultaneously:

```js
// src/utils/crypto/migrationRunner.js
    navigator.locks.request('e2ee-migration', { ifAvailable: true }, (lock) => {
      if (!lock) return resolve(false);
```

There is also a safety trigger for the "lost recovery code, start over" path — `20260722060000_wipe_financial_data_on_key_reset.sql` — because data encrypted under a discarded key is unrecoverable and must not linger as undecryptable garbage.

---

## Summary Table

| # | Feature | Category | Primary Purpose |
|---|---------|----------|-----------------|
| 1 | Row Level Security | Security | Per-row access control in the database |
| 2 | Policies with `auth.uid()` | Security | Bind rows to the authenticated user |
| 3 | Deny-all RLS | Security | Service-role-only tables |
| 4 | Explicit GRANTs | Security | Data API reachability (required since 2026) |
| 5 | SECURITY DEFINER | Security | Privileged, audited operations |
| 6 | Pinned `search_path` | Security | Prevent search-path hijacking |
| 7 | IDOR guards in RPCs | Security | Block cross-user parameter access |
| 8 | REVOKE on helpers | Security | Keep internal functions non-callable |
| 9 | UUID primary keys | Schema | Non-enumerable identifiers |
| 10 | `ON DELETE CASCADE` | Schema | Automatic dependent cleanup |
| 11 | CHECK constraints | Schema | Enum and range validation |
| 12 | UNIQUE constraints | Schema | Structural idempotency |
| 13 | Partial unique indexes | Schema | Conditional uniqueness |
| 14 | Composite/partial indexes | Performance | Match real query shapes |
| 15 | JSONB columns | Schema | Flexible, queryable metadata |
| 16 | `timestamptz` + `now()` | Schema | Unambiguous server-set time |
| 17 | PL/pgSQL functions | Logic | Procedural rules next to the data |
| 18 | Triggers | Logic | Invariants on every write path |
| 19 | `auth.users` hooks | Logic | Atomic new-user provisioning |
| 20 | `RAISE` + SQLSTATE | Logic | Machine-readable error codes |
| 21 | Shared predicates | Logic | One definition of "premium" |
| 22 | `RETURNS TABLE` | Logic | Server-computed derived fields |
| 23 | `FOR ... IN` / `record` | Logic | Per-row procedural iteration |
| 24 | `DELETE ... USING` | Query | Self-join de-duplication |
| 25 | JSONB operators | Query | Query and build nested JSON |
| 26 | Date/interval arithmetic | Query | Correct month and trial windows |
| 27 | `COALESCE`/`EXISTS`/`GREATEST` | Query | Null-safe, efficient expressions |
| 28 | Supabase Auth | Platform | Identity across API, RPC, functions |
| 29 | PostgREST Data API | Platform | CRUD without custom endpoints |
| 30 | Embedded selects | Platform | Joins in one round-trip |
| 31 | RPC calls | Platform | Invoke database logic from the client |
| 32 | `upsert` / `onConflict` | Platform | Idempotent webhook writes |
| 33 | `.range()` pagination | Platform | Page past the 1000-row cap |
| 34 | Edge Functions | Platform | Server-side secrets and webhooks |
| 35 | Signature verification | Platform | Trustworthy billing events |
| 36 | Service vs anon key | Platform | Blast-radius separation |
| 37 | Realtime (disabled) | Platform | Deliberate non-use, documented |
| 38 | Client-side E2EE | Platform | Server never sees plaintext amounts |
