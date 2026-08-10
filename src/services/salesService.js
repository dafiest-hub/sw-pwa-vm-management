import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { sampleSales, sampleSaleIncomes } from '../mock/sampleData';

export const getSalesHistory = async () => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        product:products (*),
        machine:machines (name, device_id)
      `)
      .order('created_at', { ascending: false });

    if (!error) return data;
  }
  return sampleSales;
};

export const getSaleIncomes = async () => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('sale_incomes')
      .select(`
        *,
        machine:machines (name, device_id)
      `)
      .order('created_at', { ascending: false });

    if (!error) return data;
  }
  return sampleSaleIncomes;
};

export const getFinancialSummary = async () => {
  const incomes = await getSaleIncomes();
  const sales = await getSalesHistory();

  const totalIncome = incomes.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalLiters = sales.reduce((acc, curr) => acc + Number(curr.liters_purchased || 0), 0);

  const byPaymentType = {
    monedas: incomes.filter(i => i.payment_type === 'monedas').reduce((a, c) => a + Number(c.amount), 0),
    efectivo: incomes.filter(i => i.payment_type === 'efectivo').reduce((a, c) => a + Number(c.amount), 0),
    tarjeta: incomes.filter(i => i.payment_type === 'tarjeta').reduce((a, c) => a + Number(c.amount), 0),
  };

  return {
    totalIncome,
    totalLiters,
    totalSalesCount: sales.length,
    byPaymentType
  };
};
