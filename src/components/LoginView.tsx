import React, { useState } from 'react';
import { HardHat, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginViewProps {
  onOpenSupabaseConfig: () => void;
  onOpenSqlModal: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onOpenSupabaseConfig,
  onOpenSqlModal,
}) => {
  const { signIn, isSupabaseMode } = useAuth();
  const [email, setEmail] = useState('ogabek@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка авторизации. Проверьте введенные данные.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <HardHat size={28} />
          </div>
          <div>
            <span className="font-bold text-2xl text-slate-900 tracking-tight block">
              СтройCRM
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Контроль строительных объектов и задач
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          Корпоративная система управления строительством
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-7 px-6 sm:px-8 border border-slate-200 rounded-lg shadow-sm space-y-5">
          {/* Supabase backend status */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isSupabaseMode ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
              <span className="text-slate-600">
                Режим БД: <strong>{isSupabaseMode ? 'Supabase (Live)' : 'Демо-режим'}</strong>
              </span>
            </div>
            <button
              onClick={onOpenSupabaseConfig}
              className="text-indigo-600 hover:text-indigo-800 font-medium text-[11px]"
            >
              Настройки
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Электронная почта (Email)
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ogabek@gmail.com"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Пароль
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Публичная регистрация отключена в целях безопасности. Пользователей создает администратор.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <span>{loading ? 'Авторизация...' : 'Войти в систему'}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={onOpenSqlModal}
              className="text-xs text-slate-500 hover:text-indigo-600 underline"
            >
              Посмотреть SQL-скрипт миграции Supabase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
