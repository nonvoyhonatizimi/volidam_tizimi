'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Receipt,
  Loader2,
  ShoppingBag,
  FileText,
  Clock,
  Wallet,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Expense {
  id: string;
  type: 'GENERAL' | 'INCOMING_GOODS';
  amount: number;
  description: string;
  createdAt: string;
  user: {
    fullName: string;
  };
}

interface ExpensesData {
  expenses: Expense[];
  totals: {
    totalExpenses: number;
    totalGeneral: number;
    totalIncomingGoods: number;
  };
  shift: {
    id: string;
    type: 'DAY' | 'NIGHT';
    date: string;
  };
}

export default function DokonchiDashboard() {
  const [data, setData] = useState<ExpensesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form state
  const [type, setType] = useState<'GENERAL' | 'INCOMING_GOODS'>('GENERAL');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/expenses');
      if (response.ok) {
        const data = await response.json();
        setData(data);
      }
    } catch (error) {
      console.error('Failed to fetch expenses data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount: parseFloat(amount),
          description,
        }),
      });

      if (response.ok) {
        setShowAddModal(false);
        setAmount('');
        setDescription('');
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create expense:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Xarajatlar</h1>
          <p className="text-blue-600">Bugungi xarajatlarni kiritish</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all"
        >
          <Plus className="w-5 h-5" />
          Yangi xarajat
        </button>
      </div>

      {/* Shift Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-blue-200/50 shadow-sm"
      >
        <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <p className="font-semibold text-blue-900">
            {data?.shift?.type === 'DAY' ? 'Kunduzgi smena' : 'Tungi smena'}
          </p>
          <p className="text-sm text-blue-600">
            {data?.shift?.date && new Date(data.shift.date).toLocaleDateString('uz-UZ')}
          </p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl bg-white border border-blue-200/50 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-orange-600" />
            <span className="text-blue-700">Umumiy</span>
          </div>
          <p className="text-xl font-bold text-blue-900">{formatCurrency(data?.totals?.totalGeneral || 0)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 rounded-2xl bg-white border border-blue-200/50 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            <span className="text-blue-700">Tovarlar</span>
          </div>
          <p className="text-xl font-bold text-blue-900">{formatCurrency(data?.totals?.totalIncomingGoods || 0)}</p>
        </motion.div>
      </div>

      {/* Total Expenses */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-red-100 mb-1">Jami xarajatlar</p>
            <p className="text-3xl font-bold">{formatCurrency(data?.totals?.totalExpenses || 0)}</p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <Wallet className="w-8 h-8" />
          </div>
        </div>
      </motion.div>

      {/* Recent Expenses */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-white border border-blue-200/50 shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-blue-100">
          <h3 className="font-semibold text-blue-900">So'nggi xarajatlar</h3>
        </div>
        <div className="divide-y divide-blue-100">
          {data?.expenses?.length === 0 ? (
            <div className="p-8 text-center text-blue-500">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Hali xarajat kiritilmagan</p>
            </div>
          ) : (
            data?.expenses?.map((expense, index) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-blue-50/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      expense.type === 'GENERAL' 
                        ? 'bg-orange-100 text-orange-600' 
                        : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {expense.type === 'GENERAL' ? <FileText className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-blue-900">{expense.description}</p>
                      <p className="text-xs text-blue-500">
                        {expense.type === 'GENERAL' ? 'Umumiy xarajat' : 'Tovar sotib olish'} • 
                        {new Date(expense.createdAt).toLocaleTimeString('uz-UZ', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-red-600">-{formatCurrency(expense.amount)}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-6 rounded-2xl bg-white shadow-2xl"
          >
            <h2 className="text-xl font-bold text-blue-900 mb-6">Yangi xarajat</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Xarajat turi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('GENERAL')}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                      type === 'GENERAL'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-blue-200 hover:border-blue-300'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                    Umumiy
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('INCOMING_GOODS')}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                      type === 'INCOMING_GOODS'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-blue-200 hover:border-blue-300'
                    }`}
                  >
                    <ShoppingBag className="w-5 h-5" />
                    Tovarlar
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Miqdori (so'm)
                </label>
                <input
                  type="number"
                  min="1000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Masalan: 50000"
                  className="w-full px-4 py-3 rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Izoh
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={type === 'GENERAL' ? 'Masalan: Komunal xarajatlar' : 'Masalan: Un sotib olish'}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl border border-blue-200 text-blue-700 font-medium hover:bg-blue-50 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saqlanmoqda...
                    </span>
                  ) : (
                    'Saqlash'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
