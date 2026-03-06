'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  User,
  ChefHat,
  ShoppingCart,
  Store,
  Shield,
  Loader2,
  Copy,
  Check,
  X,
  Edit2,
  Power,
} from 'lucide-react';

interface Employee {
  id: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'HAMIRCHI' | 'SOTUVCHI' | 'DOKONCHI';
  isActive: boolean;
  createdAt: string;
}

const roleConfig = {
  ADMIN: { icon: Shield, color: 'bg-purple-100 text-purple-600', label: 'Administrator' },
  HAMIRCHI: { icon: ChefHat, color: 'bg-amber-100 text-amber-600', label: 'Hamirchi' },
  SOTUVCHI: { icon: ShoppingCart, color: 'bg-emerald-100 text-emerald-600', label: 'Sotuvchi' },
  DOKONCHI: { icon: Store, color: 'bg-blue-100 text-blue-600', label: "Do'konchi" },
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCredentials, setShowCredentials] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'HAMIRCHI' | 'SOTUVCHI' | 'DOKONCHI'>('HAMIRCHI');
  const [submitting, setSubmitting] = useState(false);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, role }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowCredentials(data.credentials);
        setShowAddModal(false);
        setFullName('');
        fetchEmployees();
      }
    } catch (error) {
      console.error('Failed to create employee:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !isActive }),
      });

      if (response.ok) {
        fetchEmployees();
      }
    } catch (error) {
      console.error('Failed to update employee:', error);
    }
  };

  const copyCredentials = () => {
    if (showCredentials) {
      navigator.clipboard.writeText(
        `Login: ${showCredentials.username}\nParol: ${showCredentials.password}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
          <h1 className="text-2xl font-bold text-amber-900">Xodimlar</h1>
          <p className="text-amber-600">Barcha xodimlarni boshqarish</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/30 transition-all"
        >
          <Plus className="w-5 h-5" />
          Yangi xodim
        </button>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((employee, index) => {
          const config = roleConfig[employee.role];
          const RoleIcon = config.icon;

          return (
            <motion.div
              key={employee.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-5 rounded-2xl border transition-all ${
                employee.isActive
                  ? 'bg-white border-amber-200/50 shadow-sm'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${config.color} flex items-center justify-center`}>
                    <RoleIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-900">{employee.fullName}</h3>
                    <p className="text-sm text-amber-600">{config.label}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleActive(employee.id, employee.isActive)}
                  className={`p-2 rounded-lg transition-colors ${
                    employee.isActive
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  <Power className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-amber-100">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-700 font-mono">{employee.username}</span>
                </div>
                <p className="text-xs text-amber-400 mt-2">
                  Qo'shilgan: {new Date(employee.createdAt).toLocaleDateString('uz-UZ')}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add Employee Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-amber-900">Yangi xodim</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-lg hover:bg-amber-100 text-amber-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-amber-700 mb-2">
                    To'liq ism
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Masalan: John Doe"
                    className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-amber-700 mb-2">
                    Lavozim
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['HAMIRCHI', 'SOTUVCHI', 'DOKONCHI'] as const).map((r) => {
                      const config = roleConfig[r];
                      const RoleIcon = config.icon;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`p-3 rounded-xl border transition-all ${
                            role === r
                              ? 'border-amber-500 bg-amber-50 text-amber-700'
                              : 'border-amber-200 hover:border-amber-300'
                          }`}
                        >
                          <RoleIcon className="w-5 h-5 mx-auto mb-1" />
                          <span className="text-xs">{config.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Yaratilmoqda...
                    </span>
                  ) : (
                    'Yaratish'
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Credentials Modal */}
      <AnimatePresence>
        {showCredentials && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl bg-white shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-amber-900">Xodim yaratildi!</h2>
                <p className="text-amber-600 mt-1">Quyidagi ma'lumotlarni saqlang</p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-600 mb-1">Foydalanuvchi nomi</p>
                  <p className="text-lg font-mono font-semibold text-amber-900">{showCredentials.username}</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-600 mb-1">Parol</p>
                  <p className="text-lg font-mono font-semibold text-amber-900">{showCredentials.password}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyCredentials}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-100 text-amber-700 font-medium hover:bg-amber-200 transition-colors"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? 'Nusxa olindi' : 'Nusxa olish'}
                </button>
                <button
                  onClick={() => setShowCredentials(null)}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:shadow-lg transition-all"
                >
                  Yopish
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
