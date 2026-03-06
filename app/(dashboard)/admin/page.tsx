'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wheat,
  ShoppingBag,
  Cookie,
  CreditCard,
  Wallet,
  Receipt,
  TrendingUp,
  Sun,
  Moon,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ReportData {
  totalFlourUsed: number;
  totalQurtSold: number;
  totalNonSold: number;
  qurtClickTotal: number;
  qurtPlasticTotal: number;
  nonClickTotal: number;
  nonPlasticTotal: number;
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
}

interface Shift {
  id: string;
  type: 'DAY' | 'NIGHT';
  date: string;
  isActive: boolean;
}

export default function AdminDashboard() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReport = async () => {
    try {
      const response = await fetch('/api/reports');
      if (response.ok) {
        const data = await response.json();
        setReport(data.report);
        setShift(data.shift);
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReport();
  };

  const handleCloseShift = async () => {
    if (!confirm('Smenani yopishni xohlaysizmi?')) return;
    
    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      });
      
      if (response.ok) {
        alert('Smena muvaffaqiyatli yopildi!');
        fetchReport();
      }
    } catch (error) {
      console.error('Failed to close shift:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const stats = [
    {
      title: 'Jami un',
      value: report?.totalFlourUsed || 0,
      unit: 'kg',
      icon: Wheat,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-100',
    },
    {
      title: 'Qurt sotuvi',
      value: report?.totalQurtSold || 0,
      unit: 'kg',
      icon: Cookie,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-100',
    },
    {
      title: 'Non sotuvi',
      value: report?.totalNonSold || 0,
      unit: 'dona',
      icon: ShoppingBag,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Click',
      value: formatCurrency((report?.qurtClickTotal || 0) + (report?.nonClickTotal || 0)),
      icon: CreditCard,
      color: 'from-purple-500 to-indigo-500',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Plastik',
      value: formatCurrency((report?.qurtPlasticTotal || 0) + (report?.nonPlasticTotal || 0)),
      icon: Wallet,
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-pink-100',
    },
    {
      title: 'Xarajatlar',
      value: formatCurrency(report?.totalExpenses || 0),
      icon: Receipt,
      color: 'from-red-500 to-orange-500',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">Dashboard</h1>
          <p className="text-amber-600">Bugungi smena hisoboti</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Yangilash
          </button>
          {shift?.isActive && (
            <button
              onClick={handleCloseShift}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white hover:shadow-lg hover:shadow-red-500/30 transition-all"
            >
              Smenani yopish
            </button>
          )}
        </div>
      </div>

      {/* Shift Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-amber-200/50 shadow-sm"
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          shift?.type === 'DAY' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
        }`}>
          {shift?.type === 'DAY' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
        </div>
        <div>
          <p className="font-semibold text-amber-900">
            {shift?.type === 'DAY' ? 'Kunduzgi smena' : 'Tungi smena'}
          </p>
          <p className="text-sm text-amber-600">
            {shift?.isActive ? 'Faol' : 'Yopilgan'}
          </p>
        </div>
        {shift?.isActive && (
          <span className="ml-auto px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
            Faol
          </span>
        )}
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-6 rounded-2xl bg-white border border-amber-200/50 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-amber-600 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-amber-900">
                  {stat.value}
                  {stat.unit && <span className="text-sm font-normal text-amber-600 ml-1">{stat.unit}</span>}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 bg-gradient-to-br ${stat.color} bg-clip-text`} style={{ color: 'inherit' }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Net Profit Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 mb-1">Sof foyda</p>
            <p className="text-3xl font-bold">{formatCurrency(report?.netProfit || 0)}</p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <TrendingUp className="w-8 h-8" />
          </div>
        </div>
      </motion.div>

      {/* Payment Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div className="p-6 rounded-2xl bg-white border border-amber-200/50 shadow-sm">
          <h3 className="font-semibold text-amber-900 mb-4">Qurt to'lovlari</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-amber-600">Click</span>
              <span className="font-medium text-amber-900">{formatCurrency(report?.qurtClickTotal || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-amber-600">Plastik</span>
              <span className="font-medium text-amber-900">{formatCurrency(report?.qurtPlasticTotal || 0)}</span>
            </div>
            <div className="pt-2 border-t border-amber-200">
              <div className="flex justify-between items-center">
                <span className="font-medium text-amber-900">Jami</span>
                <span className="font-bold text-amber-900">{formatCurrency((report?.qurtClickTotal || 0) + (report?.qurtPlasticTotal || 0))}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-amber-200/50 shadow-sm">
          <h3 className="font-semibold text-amber-900 mb-4">Non to'lovlari</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-amber-600">Click</span>
              <span className="font-medium text-amber-900">{formatCurrency(report?.nonClickTotal || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-amber-600">Plastik</span>
              <span className="font-medium text-amber-900">{formatCurrency(report?.nonPlasticTotal || 0)}</span>
            </div>
            <div className="pt-2 border-t border-amber-200">
              <div className="flex justify-between items-center">
                <span className="font-medium text-amber-900">Jami</span>
                <span className="font-bold text-amber-900">{formatCurrency((report?.nonClickTotal || 0) + (report?.nonPlasticTotal || 0))}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
