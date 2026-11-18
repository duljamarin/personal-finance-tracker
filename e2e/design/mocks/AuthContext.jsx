// Signed-in demo user for the design harness.
const USER = { id: 'demo', email: 'demo@example.com', user_metadata: { username: 'Alex', preferred_currency: 'EUR' } };
const VALUE = {
  user: USER, session: {}, accessToken: 'demo', loading: false, error: null,
  login: async () => {}, logout: async () => {}, register: async () => {}, refreshUser: async () => {}, clearError: () => {},
};
export function AuthProvider({ children }) { return children; }
export function useAuth() { return VALUE; }
