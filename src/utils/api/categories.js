import { withAuth, withAuthOrEmpty, getSupabase } from './_auth';
import { encryptRow, decryptRows, decryptRow, deterministicCiphertext } from '../crypto/rowCodec';

export async function fetchCategories() {
  return withAuthOrEmpty(async (user) => {
    const supabase = await getSupabase();
    // name is deterministically encrypted, so server-side ORDER BY name sorts
    // by ciphertext (meaningless). Fetch unsorted, decrypt, sort client-side.
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;
    const rows = await decryptRows('categories', data || []);
    return rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  });
}

// Find a category by name using the deterministic ciphertext (matches the same
// plaintext under the user's key). Falls back to plaintext equality when
// encryption is off. Excludes a given id (for update duplicate checks).
async function findByName(supabase, userId, name, excludeId) {
  const needle = await deterministicCiphertext('categories', 'name', name);
  let query = supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .eq('name', needle);
  if (excludeId) query = query.neq('id', excludeId);
  const { data } = await query.maybeSingle();
  return data;
}

export async function addCategory(category) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const existing = await findByName(supabase, user.id, category.name);
    if (existing) {
      throw new Error('Category already exists.');
    }

    const row = await encryptRow('categories', { ...category, user_id: user.id });
    const { data, error } = await supabase
      .from('categories')
      .insert([row])
      .select()
      .single();

    if (error) throw error;
    return decryptRow('categories', data);
  });
}

export async function updateCategory(id, category) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const existing = await findByName(supabase, user.id, category.name, id);
    if (existing) {
      throw new Error('Category already exists.');
    }

    const row = await encryptRow('categories', category);
    const { data, error } = await supabase
      .from('categories')
      .update(row)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return decryptRow('categories', data);
  });
}

export async function deleteCategory(id) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return 'OK';
  });
}
