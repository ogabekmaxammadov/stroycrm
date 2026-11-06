import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Building2,
  User,
  Clock,
  Layers,
  LayoutGrid,
  List,
  AlertCircle,
} from 'lucide-react';
import { ConstructionObject, Task, TaskStatus, TASK_STATUS_META } from '../types';
import { StatusBadge } from './StatusBadge';
import { useAuth } from '../context/AuthContext';

interface TasksViewProps {
  tasks: Task[];
  objects: ConstructionObject[];
  loading: boolean;
  onRefresh: () => void;
  onSelectTask: (task: Task) => void;
  onOpenCreateTask: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  objects,
  loading,
  onRefresh,
  onSelectTask,
  onOpenCreateTask,
}) => {
  const { isDirector, isExecutor, user } = useAuth();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedObjectId, setSelectedObjectId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Executor only sees assigned tasks (security & requirement 2)
  const visibleTasks = isExecutor
    ? tasks.filter((t) => t.executor_id === user?.id)
    : tasks;

  const filteredTasks = visibleTasks.filter((t) => {
    const matchObj = selectedObjectId === 'all' || t.object_id === selectedObjectId;
    const matchStatus = selectedStatus === 'all' || t.status === selectedStatus;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      t.title.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.object?.name || '').toLowerCase().includes(q) ||
      (t.executor?.full_name || '').toLowerCase().includes(q);
    return matchObj && matchStatus && matchSearch;
  });

  const columns: { status: TaskStatus; title: string; color: string }[] = [
    { status: 'new', title: 'Новые', color: 'border-blue-500' },
    { status: 'in_progress', title: 'В работе', color: 'border-amber-500' },
    { status: 'under_review', title: 'На проверке', color: 'border-purple-500' },
    { status: 'rework', title: 'На доработке', color: 'border-rose-500' },
    { status: 'accepted', title: 'Принятые', color: 'border-emerald-500' },
  ];

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
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{isDirector ? 'Все строительные задачи' : 'Мои назначенные задачи'}</span>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {filteredTasks.length}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isDirector
              ? 'Контроль распределения, выполнения и приемки строительных работ'
              : 'Задачи, назначенные вам для выполнения и сдачи руководителю'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-800 shadow-2xs font-medium'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Доска канбан"
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Канбан</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-slate-800 shadow-2xs font-medium'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Список задач"
            >
              <List size={14} />
              <span className="hidden sm:inline">Список</span>
            </button>
          </div>

          {/* Director-only: Create Task */}
          {isDirector && (
            <button
              onClick={onOpenCreateTask}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus size={14} />
              <span>Создать задачу</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию или описанию..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Object Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Building2 size={13} className="text-slate-400" />
            <select
              value={selectedObjectId}
              onChange={(e) => setSelectedObjectId(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">Все объекты</option>
              {objects.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter for list view */}
          {viewMode === 'list' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Filter size={13} className="text-slate-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Все статусы</option>
                <option value="new">Новая</option>
                <option value="in_progress">В работе</option>
                <option value="under_review">На проверке</option>
                <option value="rework">На доработке</option>
                <option value="accepted">Принята</option>
              </select>
            </div>
          )}

          {(selectedObjectId !== 'all' || selectedStatus !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedObjectId('all');
                setSelectedStatus('all');
                setSearchQuery('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1"
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">
          Загрузка задач...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-lg p-8">
          <Layers size={36} className="mx-auto text-slate-300 mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">Задачи не найдены</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedObjectId !== 'all' || selectedStatus !== 'all'
              ? 'По заданным фильтрам задач не обнаружено.'
              : isDirector
              ? 'В системе еще нет задач. Нажмите "Создать задачу", чтобы назначить исполнителю.'
              : 'У вас пока нет назначенных задач.'}
          </p>
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-start">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.status);

            return (
              <div
                key={col.status}
                className="bg-slate-100/70 border border-slate-200/80 rounded-lg p-2.5 flex flex-col min-h-80"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-slate-800">
                      {col.title}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-0.2">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-md">
                      Нет задач
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className="bg-white border border-slate-200 rounded-md p-3 hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <span className="font-mono text-slate-400">
                            #{task.id.slice(-5).toUpperCase()}
                          </span>
                          <span className="text-slate-400 flex items-center gap-0.5 text-[10px]">
                            <Clock size={10} />
                            {formatDate(task.created_at)}
                          </span>
                        </div>

                        <h4 className="font-semibold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                          {task.title}
                        </h4>

                        {task.object && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 p-1 rounded border border-slate-100">
                            <Building2 size={11} className="text-slate-400 shrink-0" />
                            <span className="line-clamp-1">{task.object.name}</span>
                          </div>
                        )}

                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded-full bg-slate-200 text-[9px] font-semibold flex items-center justify-center text-slate-700">
                              {task.executor?.full_name?.[0] || 'И'}
                            </div>
                            <span className="line-clamp-1">{task.executor?.full_name}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST / TABLE VIEW */
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">ID / Название задачи</th>
                  <th className="px-4 py-3">Объект строительства</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Исполнитель</th>
                  <th className="px-4 py-3">Дата создания</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTasks.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTask(t)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-400">
                          #{t.id.slice(-6).toUpperCase()}
                        </span>
                        <span className="font-semibold text-slate-900 hover:text-indigo-600">
                          {t.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Building2 size={12} className="text-slate-400 shrink-0" />
                        <span>{t.object?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-slate-400" />
                        <span>{t.executor?.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      {formatDate(t.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
