import React, { useState } from 'react';
import { X, Database, CheckCircle2, AlertCircle, RefreshCw, Server, HelpCircle } from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig, getSupabaseClient } from '../lib/supabase';
import { resetDemoData } from '../services/dataService';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
}) => {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);

    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      setTestResult({
        success: false,
        message: 'Пожалуйста, заполните оба поля: URL проекта и Anon ключ',
      });
      setTesting(false);
      return;
    }

    try {
      // Temporarily save to test
      saveSupabaseConfig(cleanUrl, cleanKey);
      const client = getSupabaseClient();
      if (!client) {
        throw new Error('Не удалось инициализировать клиент Supabase. Проверьте формат URL.');
      }

      // Check connection by querying objects or profiles
      const { error } = await client.from('profiles').select('id').limit(1);

      if (error && !error.message.includes('relation "public.profiles" does not exist')) {
        // If it's a genuine auth/network error
        throw new Error(error.message);
      }

      setTestResult({
        success: true,
        message: 'Соединение с Supabase успешно установлено!',
      });

      setTimeout(() => {
        onConfigChanged();
        onClose();
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Ошибка подключения: ' + (err.message || 'Проверьте правильность URL и Anon Key'),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSwitchToDemo = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setTestResult({
      success: true,
      message: 'Переключено в локальный демо-режим с тестовыми данными',
    });
    setTimeout(() => {
      onConfigChanged();
      onClose();
      window.location.reload();
    }, 700);
  };

  const handleResetDemoData = () => {
    if (confirm('Сбросить локальные данные к начальному состоянию (тестовые объекты и задачи)?')) {
      resetDemoData();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100">
              <Server size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                Подключение к Supabase
              </h2>
              <p className="text-xs text-slate-500">
                Вставьте параметры вашего проекта Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleTestAndSave} className="p-6 space-y-4 text-xs">
          {/* Status Indicator */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between">
            <span className="text-slate-600 font-medium">Текущий статус:</span>
            {currentConfig.isConfigured ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs font-medium">
                <CheckCircle2 size={13} />
                Подключено к Supabase
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs font-medium">
                <Database size={13} />
                Демо-режим (Локальная БД)
              </span>
            )}
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Project URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzproject.supabase.co"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <HelpCircle size={11} />
              Панель Supabase → Project Settings → API → Project URL
            </p>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Anon Public API Key
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <HelpCircle size={11} />
              Панель Supabase → Project Settings → API → Project API Keys (anon public)
            </p>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-md text-xs border flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={testing}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              {testing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Проверка подключения...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Сохранить и подключиться</span>
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={handleSwitchToDemo}
                className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition-colors"
              >
                Вернуться в Демо-режим
              </button>
              <button
                type="button"
                onClick={handleResetDemoData}
                className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition-colors"
              >
                Сбросить демо-данные
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
