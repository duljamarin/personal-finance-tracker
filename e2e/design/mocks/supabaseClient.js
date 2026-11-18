// No network in the design harness.
const chain = new Proxy(function noop() {}, {
  get: (_t, prop) => (prop === 'then' ? undefined : chain),
  apply: () => chain,
});
export const supabase = {
  auth: { getUser: async () => ({ data: { user: { id: 'demo' } }, error: null }), getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
  from: () => chain,
  rpc: async () => ({ data: null, error: null }),
  channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
  removeChannel: () => {},
  functions: { invoke: async () => ({ data: null, error: null }) },
};
export default supabase;
