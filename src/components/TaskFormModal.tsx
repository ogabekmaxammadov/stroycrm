import React, { useState, useEffect } from 'react';
import { X, Check, Building2, User, FileText, AlertCircle } from 'lucide-react';
import { ConstructionObject, Task, UserProfile } from '../types';
import { dataService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  taskToEdit?: Task | null;
  defaultObjectId?: string;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  taskToEdit,
  defaultObjectId,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [objectId, setObjectId] = useState('');
  const [executorId, setExecutorId] = useState('');

  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [executors, setExecutors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFormData();
      if (taskToEdit) {
        setTitle(taskToEdit.title);
        setDescription(taskToEdit.description || '');
        setObjectId(taskToEdit.object_id);
        setExecutorId(taskToEdit.executor_id);
      } else {
        setTitle('');
        setDescription('');
        setObjectId(defaultObjectId || '');
        setExecutorId('');
      }
      setError(null);
    }
  }, [isOpen, taskToEdit, defaultObjectId]);

  const loadFormData = async () => {
    setLoading(true);
    try {
      const [objs, execs] = await Promise.all([
        dataService.getObjects(),
        dataService.getExecutors(),
      ]);
      setObjects(objs);
      setExecutors(execs);

      if (!taskToEdit) {
        if (defaultObjectId) {
          setObjectId(defaultObjectId);
        } else if (objs.length > 0) {
          setObjectId(objs[0].id);
        }
        if (execs.length > 0) {
          setExecutorId(execs[0].id);
        }
      }
    } catch (err: any) {
      setError('Не удалось загрузить списки объектов и исполнителей');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Укажите название задачи');
      return;
    }
    if (!objectId) {
      setError('Выберите строительный объект');
      return;
    }
    if (!executorId) {
      setError('Назначьте ответственного исполнителя');
      return;
    }
    if (!user) {
      setError('Необходима авторизация');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (taskToEdit) {
        await dataService.updateTaskDetails(taskToEdit.id, {
          title: title.trim(),
          description: description.trim(),
          object_id: objectId,
          executor_id: executorId,
        });
      } else {
        await dataService.createTask(
          {
            title: title.trim(),
            description: description.trim(),
            object_id: objectId,
            executor_id: executorId,
          },
          user.id
        );
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка при сохранении задачи');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                {taskToEdit ? 'Редактирование задачи' : 'Новая строительная задача'}
              </h2>
              <p className="text-xs text-slate-500">
                {taskToEdit
                  ? 'Изменение параметров задачи'
                  : 'Задача будет создана в статусе "Новая"'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-800 flex items-center gap-2">
              <AlertCircle size={15} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Название задачи *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Монтаж опалубки перекрытия 4-го этажа"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                <Building2 size={12} className="text-slate-400" />
                Строительный объект *
              </label>
              <select
                required
                value={objectId}
                onChange={(e) => setObjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                {objects.map((obj) => (
                  <option key={obj.id} value={obj.id}>
                    {obj.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                <User size={12} className="text-slate-400" />
                Назначить исполнителя *
              </label>
              <select
                required
                value={executorId}
                onChange={(e) => setExecutorId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                {executors.map((exec) => (
                  <option key={exec.id} value={exec.id}>
                    {exec.full_name} ({exec.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Описание и регламент выполнения
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Укажите технологические требования, проектные чертежи, материалы..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium text-xs transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Check size={14} />
              <span>{saving ? 'Сохранение...' : taskToEdit ? 'Сохранить изменения' : 'Создать задачу'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
