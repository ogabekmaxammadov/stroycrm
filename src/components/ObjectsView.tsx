import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Plus,
  Search,
  CheckCircle2,
  ListTodo,
  Edit2,
  Trash2,
  ArrowRight,
  Clock,
  Layers,
} from 'lucide-react';
import { ConstructionObject } from '../types';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';

interface ObjectsViewProps {
  objects: ConstructionObject[];
  loading: boolean;
  onRefresh: () => void;
  onSelectObject: (obj: ConstructionObject) => void;
  onOpenCreateObject: () => void;
  onEditObject: (obj: ConstructionObject) => void;
}

export const ObjectsView: React.FC<ObjectsViewProps> = ({
  objects,
  loading,
  onRefresh,
  onSelectObject,
  onOpenCreateObject,
  onEditObject,
}) => {
  const { isDirector } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = objects.filter((o) => {
    const q = searchQuery.toLowerCase();
    return o.name.toLowerCase().includes(q) || o.address.toLowerCase().includes(q);
  });

  const handleDelete = async (e: React.MouseEvent, obj: ConstructionObject) => {
    e.stopPropagation();
    if (!isDirector) return;
    if (confirm(`Удалить объект «${obj.name}» и все привязанные к нему задачи?`)) {
      try {
        await dataService.deleteObject(obj.id);
        onRefresh();
      } catch (err: any) {
        alert(err.message || 'Ошибка удаления объекта');
      }
    }
  };

  const handleEdit = (e: React.MouseEvent, obj: ConstructionObject) => {
    e.stopPropagation();
    onEditObject(obj);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Строительные объекты</span>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {objects.length}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Строительные площадки, активные участки и прогресс выполнения задач
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию или адресу..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-52 sm:w-64"
            />
          </div>

          {/* Director-only: Create Object */}
          {isDirector && (
            <button
              onClick={onOpenCreateObject}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
            >
              <Plus size={14} />
              <span>Добавить объект</span>
            </button>
          )}
        </div>
      </div>

      {/* Objects Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">
          Загрузка списка объектов...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-lg p-8">
          <Building2 size={36} className="mx-auto text-slate-300 mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">Объекты не найдены</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'По запросу ничего не найдено. Попробуйте изменить параметры поиска.'
              : isDirector
              ? 'Создайте первый строительный объект, чтобы распределять задачи и контролировать ход работ.'
              : 'В системе пока нет активных строительных объектов.'}
          </p>
          {isDirector && !searchQuery && (
            <button
              onClick={onOpenCreateObject}
              className="mt-4 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Добавить объект</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((obj) => {
            const totalTasks = obj.tasks_count || 0;
            const completed = obj.completed_tasks_count || 0;
            const percent = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

            return (
              <div
                key={obj.id}
                onClick={() => onSelectObject(obj)}
                className="group bg-white border border-slate-200 rounded-lg p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <Building2 size={16} />
                      </div>
                      <h2 className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {obj.name}
                      </h2>
                    </div>

                    {isDirector && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={(e) => handleEdit(e, obj)}
                          title="Редактировать объект"
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, obj)}
                          title="Удалить объект"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-1.5 text-xs text-slate-500 mb-3">
                    <MapPin size={13} className="shrink-0 mt-0.5 text-slate-400" />
                    <span className="line-clamp-2 leading-relaxed">{obj.address}</span>
                  </div>

                  {/* Description */}
                  {obj.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 mb-4 bg-slate-50/60 p-2 rounded border border-slate-100">
                      {obj.description}
                    </p>
                  )}
                </div>

                {/* Progress & Task Summary */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <ListTodo size={13} />
                      Всего задач: <strong className="text-slate-700">{totalTasks}</strong>
                    </span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      Принято: <strong className="text-emerald-700">{completed}</strong>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Готовность объекта</span>
                      <span className="font-semibold text-slate-600">{percent}%</span>
                    </div>
                  </div>

                  {/* Open Link CTA */}
                  <div className="pt-1 flex items-center justify-between text-xs text-indigo-600 font-medium group-hover:translate-x-0.5 transition-transform">
                    <span>Открыть задачи объекта</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
