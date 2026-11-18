import { TRANSACTIONS } from './fixtures';

// Shared mutable list so the API mock and the TransactionContext mock agree.
export const store = { transactions: [...TRANSACTIONS] };
