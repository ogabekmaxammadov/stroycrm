import React, { useState, useEffect } from 'react';
import { X, Check, Building2, MapPin, AlertCircle } from 'lucide-react';
import { ConstructionObject } from '../types';
import { dataService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';

interface ObjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  objectToEdit?: ConstructionObject | null;
}

export const ObjectFormModal: React.FC<ObjectFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  objectToEdit,
}) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (objectToEdit) {
        setName(objectToEdit.name);
        setAddress(objectToEdit.address);
        setDescription(objectToEdit.description || '');
      } else {
        setName('');
        setAddress('');
        setDescription('');
      }
      setError(null);
    }
  }, [isOpen, objectToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Укажите название объекта');
      return;
    }
    if (!address.trim()) {
      setError('Укажите адрес строительной площадки');
      return;
    }
    if (!user) {
      setError('Необходима авторизация');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (objectToEdit) {
        await dataService.updateObject(objectToEdit.id, {
          name: name.trim(),
          address: address.trim(),
          description: description.trim(),
        });
      } else {
        await dataService.createObject(
          {
            name: name.trim(),
            address: address.trim(),
            description: description.trim(),
          },
          user.id
        );
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения объекта');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                {objectToEdit ? 'Редактировать объект' : 'Новый строительный объект'}
              </h2>
              <p className="text-xs text-slate-500">
                {objectToEdit ? 'Изменение данных объекта' : 'Добавление строительной площадки'}
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
              Название объекта *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: ЖК «Северное Сияние», Корпус 2"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
              <MapPin size={12} className="text-slate-400" />
              Адрес строительной площадки *
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Например: г. Ташкент, Мирзо-Улугбекский р-н, ул. Навои, 45"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Характеристики и описание
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Количество этажей, тип фундамента, генеральный подрядчик..."
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
              disabled={saving}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Check size={14} />
              <span>{saving ? 'Сохранение...' : objectToEdit ? 'Сохранить изменения' : 'Создать объект'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
