import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { sampleProducts } from '../mock/sampleData';

export const getProducts = async () => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sku', { ascending: true });

    if (!error) return data;
  }
  return sampleProducts;
};

export const createProduct = async (productData) => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select();

    if (error) throw error;
    return data[0];
  }

  const newProd = {
    id: `p${Date.now()}`,
    ...productData,
    created_at: new Date().toISOString()
  };
  sampleProducts.push(newProd);
  return newProd;
};
