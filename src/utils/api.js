import { supabase } from './supabaseClient';

// Category API with Supabase
export async function fetchCategories() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return []; // Return empty array if not authenticated
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function addCategory(category) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to add categories');
  
  // Check if category already exists
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', category.name)
    .single();
  
  if (existing) {
    throw new Error('Category already exists (409)');
  }
  
  const { data, error } = await supabase
    .from('categories')
    .insert([{ ...category, user_id: user.id }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateCategory(id, category) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to update categories');
  
  // Check if another category with the same name exists
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', category.name)
    .neq('id', id)
    .single();
  
  if (existing) {
    throw new Error('Category already exists (409)');
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
}

export async function deleteCategory(id) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to delete categories');
  
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  
  if (error) throw error;
  return 'OK';
}

export async function getCategory(id) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to view categories');
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  
  if (error) throw error;
  return data;
}

// Transaction API with Supabase
export async function fetchTransactions({ type } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return []; // Return empty array if not authenticated
  
  let query = supabase
    .from('transactions')
    .select(`
      *,
      category:categories(id, name)
    `)
    .eq('user_id', user.id)
    .order('date', { ascending: false });
  
  // Filter by type if specified
  if (type && type !== 'all') {
    query = query.eq('type', type);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

export async function addTransaction(transaction) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to add transactions');
  
  // Remove category object if present, keep only categoryId
  const { category, categoryId, ...rest } = transaction;
  const insertData = {
    ...rest,
    category_id: categoryId,
    user_id: user.id
  };
  
  const { data, error } = await supabase
    .from('transactions')
    .insert([insertData])
    .select(`
      *,
      category:categories(id, name)
    `)
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateTransaction(id, transaction) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to update transactions');
  
  // Remove category object if present, keep only categoryId
  const { category, categoryId, ...rest } = transaction;
  const updateData = {
    ...rest,
    category_id: categoryId
  };
  
  const { data, error } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(`
      *,
      category:categories(id, name)
    `)
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to delete transactions');
  
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  
  if (error) throw error;
  return 'OK';
}

export async function getTransaction(id) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to view transactions');
  
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      category:categories(id, name)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  
  if (error) throw error;
  return data;
}
