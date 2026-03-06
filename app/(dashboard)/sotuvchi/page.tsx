'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  ShoppingCart,
  Loader2,
  Cookie,
  ShoppingBag,
  CreditCard,
  Wallet,
  Clock,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Sale {
  id: string;
  itemType: 'QURT' | 'NON';
  productType: string;
  quantity: number;
  totalPrice: number;
  paymentType: 'CLICK' | 'PLASTIC';
  createdAt: string;
  user: {
    fullName: string;
  };
}

interface SalesData {
  sales: Sale[];
  totals: {
    totalQurtSold: number;
    totalNonSold: number;
    qurtClickTotal: number;
    qurtPlasticTotal: number;
    nonClickTotal: number;
    nonPlasticTotal: number;
    totalSales: number;
  };
  shift: {
    id: string;
    type: 'DAY' | 'NIGHT';
    date: string;
  };
}

const qurtTypes = ['Sutli', 'Qatiqli', 'Oddiy', 'Maxsus'];
const nonTypes = ['Patir', 'Tandir', 'Kulcha', 'Lepyoshka'];

export default function SotuvchiDashboard() {
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form state
  const [itemType, setItemType] = useState<'QURT' | 'NON'>('QURT');
  const [productType, setProductType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [paymentType, setPaymentType] = useState<'CLICK' | 'PLASTIC'>('CLICK');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/sales');
      if (response.ok) {
        const data = await response.json();
        setData(data);
      }
    } catch (error) {
      console.error('Failed to fetch sales data:', error);
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
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType,
          productType,
          quantity: parseFloat(quantity),
          totalPrice: parseFloat(totalPrice),
          paymentType,
        }),
      });

      if (response.ok) {
        setShowAddModal(false);
        setProductType('');
        setQuantity('');
        setTotalPrice('');
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create sale:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const productTypes = itemType === 'QURT' ? qurtTypes : nonTypes;
  const quantityLabel = itemType === 'QURT' ? 'Og\'irligi (kg)' : 'Soni (dona)';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Sotuv</h1>
          <p className="text-emerald-600">Bugungi sotuvlarni kiritish</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
        >
          <Plus className="w-5 h-5" />
          Yangi sotuv
        </button>
      </div>

      {/* Shift Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-emerald-200/50 shadow-sm"
      >
        <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <p className="font-semibold text-emerald-900">
            {data?.shift?.type === 'DAY' ? 'Kunduzgi smena' : 'Tungi smena'}
          </p>
          <p className="text-sm text-emerald-600">
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
          className="p-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30"
        >
          <div className="flex items-center gap-3 mb-2">
            <Cookie className="w-5 h-5" />
            <span className="text-amber-100">Qurt</span>
          </div>
          <p className="text-2xl font-bold">{data?.totals?.totalQurtSold || 0} kg</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
        >
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="w-5 h-5" />
            <span className="text-blue-100">Non</span>
          </div>
          <p className="text-2xl font-bold">{data?.totals?.totalNonSold || 0} dona</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-2xl bg-white border border-emerald-200/50 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-purple-600" />
            <span className="text-emerald-700">Click</span>
          </div>
          <p className="text-xl font-bold text-emerald-900">
            {formatCurrency((data?.totals?.qurtClickTotal || 0) + (data?.totals?.nonClickTotal || 0))}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-5 rounded-2xl bg-white border border-emerald-200/50 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-5 h-5 text-pink-600" />
            <span className="text-emerald-700">Plastik</span>
          </div>
          <p className="text-xl font-bold text-emerald-900">
            {formatCurrency((data?.totals?.qurtPlasticTotal || 0) + (data?.totals?.nonPlasticTotal || 0))}
          </p>
        </motion.div>
      </div>

      {/* Total Sales */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 mb-1">Jami sotuv</p>
            <p className="text-3xl font-bold">{formatCurrency(data?.totals?.totalSales || 0)}</p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <ShoppingCart className="w-8 h-8" />
          </div>
        </div>
      </motion.div>

      {/* Recent Sales */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl bg-white border border-emerald-200/50 shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-emerald-100">
          <h3 className="font-semibold text-emerald-900">So'nggi sotuvlar</h3>
        </div>
        <div className="divide-y divide-emerald-100">
          {data?.sales?.length === 0 ? (
            <div className="p-8 text-center text-emerald-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Hali sotuv kiritilmagan</p>
            </div>
          ) : (
            data?.sales?.map((sale, index) => (
              <motion.div
                key={sale.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 flex items-center justify-between hover:bg-emerald-50/50"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    sale.itemType === 'QURT' 
                      ? 'bg-amber-100 text-amber-600' 
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {sale.itemType === 'QURT' ? <Cookie className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-emerald-900">{sale.productType}</p>
                    <p className="text-xs text-emerald-500">
                      {sale.quantity} {sale.itemType === 'QURT' ? 'kg' : 'dona'} • 
                      {sale.paymentType === 'CLICK' ? ' Click' : ' Plastik'}
                    </p>
                  </div>
                </div>
                <span className="font-semibold text-emerald-900">{formatCurrency(sale.totalPrice)}</span>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Add Sale Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-6 rounded-2xl bg-white shadow-2xl"
          >
            <h2 className="text-xl font-bold text-emerald-900 mb-6">Yangi sotuv</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Item Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-emerald-700 mb-2">
                  Mahsulot turi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setItemType('QURT'); setProductType(''); }}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                      itemType === 'QURT'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-emerald-200 hover:border-emerald-300'
                    }`}
                  >
                    <Cookie className="w-5 h-5" />
                    Qurt
                  </button>
                  <button
                    type="button"
                    onClick={() => { setItemType('NON'); setProductType(''); }}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                      itemType === 'NON'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-emerald-200 hover:border-emerald-300'
                    }`}
                  >
                    <ShoppingBag className="w-5 h-5" />
                    Non
                  </button>
                </div>
              </div>

              {/* Product Type */}
              <div>
                <label className="block text-sm font-medium text-emerald-700 mb-2">
                  {itemType === 'QURT' ? 'Qurt turi' : 'Non turi'}
                </label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  required
                >
                  <option value="">Turini tanlang</option>
                  {productTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-emerald-700 mb-2">
                  {quantityLabel}
                </label>
                <input
                  type="number"
                  step={itemType === 'QURT' ? '0.1' : '1'}
                  min="0.1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={itemType === 'QURT' ? 'Masalan: 2.5' : 'Masalan: 5'}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  required
                />
              </div>

              {/* Total Price */}
              <div>
                <label className="block text-sm font-medium text-emerald-700 mb-2">
                  Jami narx (so'm)
                </label>
                <input
                  type="number"
                  min="1000"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(e.target.value)}
                  placeholder="Masalan: 50000"
                  className="w-full px-4 py-3 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  required
                />
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-sm font-medium text-emerald-700 mb-2">
                  To'lov turi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType('CLICK')}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                      paymentType === 'CLICK'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-emerald-200 hover:border-emerald-300'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    Click
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('PLASTIC')}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                      paymentType === 'PLASTIC'
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-emerald-200 hover:border-emerald-300'
                    }`}
                  >
                    <Wallet className="w-5 h-5" />
                    Plastik
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl border border-emerald-200 text-emerald-700 font-medium hover:bg-emerald-50 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:shadow-lg transition-all disabled:opacity-50"
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
