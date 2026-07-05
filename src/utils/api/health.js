import { withAuth } from './_auth';
import { computeCategoryBenchmarks } from '../finance/benchmarks';
import { getHealthScore, getHealthScoreHistory } from '../finance/healthScore';

export async function fetchCategoryBenchmarks(months = 1) {
  return withAuth(async (user) => {
    // Ported client-side: amounts are E2E-encrypted, so the old
    // get_category_benchmarks RPC can no longer aggregate them server-side.
    return computeCategoryBenchmarks(user.id, months);
  });
}

export async function fetchHealthScore({ month } = {}) {
  return withAuth(async (user) => {
    // Ported client-side (see finance/healthScore.js). forceRecalculate is no
    // longer meaningful — the score is always recomputed from decrypted data.
    return getHealthScore(user.id, { month });
  });
}

export async function fetchHealthScoreHistory(months = 12) {
  return withAuth(async (user) => {
    // Reads stored snapshots from financial_health_scores (money fields
    // decrypted client-side). See finance/healthScore.js.
    return getHealthScoreHistory(user.id, months);
  });
}
