import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Plus,
  Search,
  CheckCircle2,
  Filter,
  User,
  Clock,
  Layers,
} from 'lucide-react';
import { ConstructionObject, Task, TaskStatus, TASK_STATUS_META } from '../types';
import { StatusBadge } from './StatusBadge';
import { useAuth } from '../context/AuthContext';

interface ObjectDetailViewProps {
  object: ConstructionObject;
  tasks: Task[];
  loading: boolean;
  onBack: () => void;
  onSelectTask: (task: Task) => void;
  onOpenCreateTask: (objectId: string) => void;
}

export const ObjectDetailView: React.FC<ObjectDetailViewProps> = ({
  object,
  tasks,
  loading,
  onBack,
  onSelectTask,
  onOpenCreateTask,
}) => {
  const { isDirector, isExecutor, user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // If executor, can only see assigned tasks (as per requirement 2)
  const visibleTasks = isExecutor
    ? tasks.filter((t) => t.executor_id === user?.id)
    : tasks;

  const filteredTasks = visibleTasks.filter((t) => {
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      t.title.toLowerCase().includes(q) ||
      (t.executor?.full_name || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const total = visibleTasks.length;
  const completed = visibleTasks.filter((t) => t.status === 'accepted').length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const statusCounts = {
    new: visibleTasks.filter((t) => t.status === 'new').length,
    in_progress: visibleTasks.filter((t) => t.status === 'in_progress').length,
    under_review: visibleTasks.filter((t) => t.status === 'under_review').length,
    accepted: visibleTasks.filter((t) => t.status === 'accepted').length,
    rework: visibleTasks.filter((t) => t.status === 'rework').length,
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'short',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors mb-2"
        >
          <ArrowLeft size={14} />
          <span>Назад ко всем объектам</span>
        </button>

        {/* Object Hero Banner */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Building2 size={18} />
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {object.name}
                </h1>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin size={13} className="text-slate-400 shrink-0" />
                <span>{object.address}</span>
              </div>
              {object.description && (
                <p className="text-xs text-slate-600 max-w-2xl pt-1">
                  {object.description}
                </p>
              )}
            </div>

            {/* Quick Actions & Progress Widget */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3 min-w-44">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 font-medium">Прогресс объекта</span>
                  <span className="font-bold text-emerald-700">{percent}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-1">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
                <div className="text-[10px] text-slate-400 text-right">
                  {completed} из {total} задач принято
                </div>
              </div>

              {isDirector && (
                <button
                  onClick={() => onOpenCreateTask(object.id)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
                >
                  <Plus size={14} />
                  <span>Создать задачу</span>
                </button>
              )}
            </div>
          </div>

          {/* Status Breakdown Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-5 pt-4 border-t border-slate-100">
            {(['new', 'in_progress', 'under_review', 'rework', 'accepted'] as TaskStatus[]).map(
              (st) => {
                const meta = TASK_STATUS_META[st];
                const count = statusCounts[st];
                const active = statusFilter === st;

                return (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(active ? 'all' : st)}
                    className={`p-2.5 rounded-md border text-left transition-all ${
                      active
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-slate-600 font-medium">{meta.label}</span>
                      <span className="font-bold text-slate-900">{count}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {active ? 'Фильтр активен' : 'Нажмите для фильтра'}
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Task List Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-800">
            Задачи объекта {statusFilter !== 'all' && `(${TASK_STATUS_META[statusFilter]?.label})`}
          </h2>
          <span className="text-xs text-slate-400">({filteredTasks.length})</span>
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="text-xs text-indigo-600 hover:underline ml-1"
            >
              Сбросить фильтр
            </button>
          )}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по задачам или исполнителям..."
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-64"
          />
        </div>
      </div>

      {/* Tasks Table / Card List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Загрузка задач...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-12 text-center bg-white border border-slate-200 rounded-lg p-6">
          <Layers size={32} className="mx-auto text-slate-300 mb-2" />
          <h3 className="text-xs font-semibold text-slate-700">Задачи не найдены</h3>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery || statusFilter !== 'all'
              ? 'Нет задач, соответствующих выбранным критериям'
              : 'Для этого строительного объекта пока не создано задач.'}
          </p>
          {isDirector && statusFilter === 'all' && !searchQuery && (
            <button
              onClick={() => onOpenCreateTask(object.id)}
              className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium inline-flex items-center gap-1.5"
            >
              <Plus size={13} />
              <span>Создать первую задачу</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((t) => (
            <div
              key={t.id}
              onClick={() => onSelectTask(t)}
              className="group bg-white border border-slate-200 rounded-lg p-3.5 hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono font-medium text-slate-400">
                    #{t.id.slice(-6).toUpperCase()}
                  </span>
                  <StatusBadge status={t.status} size="sm" />
                </div>
                <h3 className="font-semibold text-slate-900 text-xs group-hover:text-indigo-600 transition-colors">
                  {t.title}
                </h3>
                {t.description && (
                  <p className="text-[11px] text-slate-500 line-clamp-1 max-w-xl">
                    {t.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0 self-end sm:self-center">
                <div className="flex items-center gap-1.5">
                  <User size={12} className="text-slate-400" />
                  <span className="font-medium text-slate-700">
                    {t.executor?.full_name || 'Не назначен'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock size={11} />
                  <span>{formatDate(t.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
