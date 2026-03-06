'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Wheat,
  Loader2,
  ChefHat,
  Calendar,
  Clock,
} from 'lucide-react';

interface DoughEntry {
  id: string;
  breadType: string;
  flourAmount: number;
  createdAt: string;
  user: {
    fullName: string;
  };
}

interface DoughData {
  entries: DoughEntry[];
  totals: {
    totalFlourUsed: number;
    byBreadType: Record<string, number>;
    byHamirchi: Record<string, number>;
  };
  shift: {
    id: string;
    type: 'DAY' | 'NIGHT';
    date: string;
  };
}

const breadTypes = [
  'Patir',
  'Tandir',
  'Kulcha',
  'Lepyoshka',
  'Buxanka',
];

export default function HamirchiDashboard() {
  const [data, setData] = useState<DoughData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form state
  const [breadType, setBreadType] = useState('');
  const [flourAmount, setFlourAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/dough');
      if (response.ok) {
        const data = await response.json();
        setData(data);
      }
    } catch (error) {
      console.error('Failed to fetch dough data:', error);
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
      const response = await fetch('/api/dough', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ breadType, flourAmount: parseFloat(flourAmount) }),
      });

      if (response.ok) {
        setShowAddModal(false);
        setBreadType('');
        setFlourAmount('');
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create entry:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">Hamir ishlar</h1>
          <p className="text-amber-600">Bugungi hamir ishlarini kiritish</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/30 transition-all"
        >
          <Plus className="w-5 h-5" />
          Yangi kirish
        </button>
      </div>

      {/* Shift Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-amber-200/50 shadow-sm"
      >
        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <p className="font-semibold text-amber-900">
            {data?.shift?.type === 'DAY' ? 'Kunduzgi smena' : 'Tungi smena'}
          </p>
          <p className="text-sm text-amber-600">
            {data?.shift?.date && new Date(data.shift.date).toLocaleDateString('uz-UZ')}
          </p>
        </div>
      </motion.div>

      {/* Total Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-amber-100 mb-1">Jami ishlatilgan un</p>
            <p className="text-3xl font-bold">{data?.totals?.totalFlourUsed || 0} kg</p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <Wheat className="w-8 h-8" />
          </div>
        </div>
      </motion.div>

      {/* By Bread Type */}
      {data?.totals?.byBreadType && Object.keys(data.totals.byBreadType).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl bg-white border border-amber-200/50 shadow-sm"
        >
          <h3 className="font-semibold text-amber-900 mb-4">Non turlari bo'yicha</h3>
          <div className="space-y-3">
            {Object.entries(data.totals.byBreadType).map(([type, amount]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-amber-700">{type}</span>
                <span className="font-medium text-amber-900">{amount} kg</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Entries */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-white border border-amber-200/50 shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-amber-100">
          <h3 className="font-semibold text-amber-900">So'nggi kirishlar</h3>
        </div>
        <div className="divide-y divide-amber-100">
          {data?.entries?.length === 0 ? (
            <div className="p-8 text-center text-amber-500">
              <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Hali ma'lumot kiritilmagan</p>
            </div>
          ) : (
            data?.entries?.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 flex items-center justify-between hover:bg-amber-50/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Wheat className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-900">{entry.breadType}</p>
                    <p className="text-xs text-amber-500">
                      {new Date(entry.createdAt).toLocaleTimeString('uz-UZ', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <span className="font-semibold text-amber-900">{entry.flourAmount} kg</span>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-6 rounded-2xl bg-white shadow-2xl"
          >
            <h2 className="text-xl font-bold text-amber-900 mb-6">Yangi kirish</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-amber-700 mb-2">
                  Non turi
                </label>
                <select
                  value={breadType}
                  onChange={(e) => setBreadType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  required
                >
                  <option value="">Non turini tanlang</option>
                  {breadTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-700 mb-2">
                  Un miqdori (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={flourAmount}
                  onChange={(e) => setFlourAmount(e.target.value)}
                  placeholder="Masalan: 10"
                  className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl border border-amber-200 text-amber-700 font-medium hover:bg-amber-50 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:shadow-lg transition-all disabled:opacity-50"
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
