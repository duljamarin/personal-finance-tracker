import { supabase } from '../supabaseClient';
import { withAuth, withAuthOrEmpty } from './_auth';

export async function fetchCategories() {
  return withAuthOrEmpty(async (user) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  });
}

export async function addCategory(category) {
  return withAuth(async (user) => {
    // Check if category already exists
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', category.name)
      .single();

    if (existing) {
      throw new Error('Category already exists.');
    }

    const { data, error } = await supabase
      .from('categories')
      .insert([{ ...category, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}

export async function updateCategory(id, category) {
  return withAuth(async (user) => {
    // Check if another category with the same name exists
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', category.name)
      .neq('id', id)
      .single();

    if (existing) {
      throw new Error('Category already exists.');
    }

    const { data, error } = await supabase
      .from('categories')
      .update(category)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}

export async function deleteCategory(id) {
  return withAuth(async (user) => {
    // Database CASCADE constraint will automatically delete associated transactions
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return 'OK';
  });
}

export async function getCategory(id) {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return data;
  });
}
