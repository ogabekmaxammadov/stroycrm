import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  User,
  Calendar,
  Clock,
  MessageSquare,
  AlertCircle,
  Play,
  Send,
  CheckCircle,
  RotateCcw,
  Trash2,
  Edit,
  History,
  ShieldAlert,
} from 'lucide-react';
import { Task, TaskHistoryItem, TaskStatus, TASK_STATUS_META } from '../types';
import { StatusBadge } from './StatusBadge';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
  onEditTask?: (task: Task) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
  onEditTask,
}) => {
  const { user, isDirector, isExecutor } = useAuth();
  const [history, setHistory] = useState<TaskHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Comment dialog state for transitions
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    if (task && isOpen) {
      loadHistory(task.id);
      setErrorMessage(null);
      setPendingStatus(null);
      setCommentText('');
      setCommentError(null);
    }
  }, [task, isOpen]);

  const loadHistory = async (taskId: string) => {
    setLoadingHistory(true);
    try {
      const items = await dataService.getTaskHistory(taskId);
      setHistory(items);
    } catch (err: any) {
      console.error('Error loading task history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!isOpen || !task) return null;

  const isAssignedExecutor = isExecutor && user?.id === task.executor_id;

  // Calculate allowed transitions for the current user and current task status
  // 1. new -> in_progress (by assigned executor)
  // 2. in_progress -> under_review (by assigned executor)
  // 3. under_review -> accepted (by director)
  // 4. under_review -> rework (by director, requires comment!)
  // 5. rework -> in_progress (by assigned executor)
  const canStartTask = isAssignedExecutor && (task.status === 'new' || task.status === 'rework');
  const canSendToReview = isAssignedExecutor && task.status === 'in_progress';
  const canAcceptTask = isDirector && task.status === 'under_review';
  const canReturnForRework = isDirector && task.status === 'under_review';

  const hasAnyAction = canStartTask || canSendToReview || canAcceptTask || canReturnForRework;

  const initiateTransition = (targetStatus: TaskStatus) => {
    setPendingStatus(targetStatus);
    setCommentText('');
    setCommentError(null);
  };

  const confirmTransition = async () => {
    if (!pendingStatus || !user) return;

    if (pendingStatus === 'rework' && !commentText.trim()) {
      setCommentError('Комментарий обязателен при возврате задачи на доработку');
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    try {
      await dataService.changeTaskStatus(
        task.id,
        pendingStatus,
        commentText.trim() || null,
        user
      );
      setPendingStatus(null);
      setCommentText('');
      await loadHistory(task.id);
      onTaskUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Ошибка при изменении статуса задачи');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!isDirector) return;
    if (confirm('Вы уверены, что хотите удалить эту задачу? Это действие необратимо.')) {
      try {
        await dataService.deleteTask(task.id);
        onTaskUpdated();
        onClose();
      } catch (err: any) {
        setErrorMessage(err.message || 'Ошибка удаления задачи');
      }
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="space-y-1 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-medium text-slate-400">
                #{task.id.slice(-6).toUpperCase()}
              </span>
              <StatusBadge status={task.status} size="md" />
              {task.object && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  <Building2 size={12} className="text-slate-400" />
                  {task.object.name}
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-slate-900 leading-snug">
              {task.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Ошибка операции</p>
                <p className="text-rose-700 text-[11px] mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Key Meta Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-md">
            <div className="space-y-1">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <User size={12} />
                Назначенный исполнитель
              </span>
              <div className="font-medium text-slate-800">
                {task.executor?.full_name || 'Не назначен'}
              </div>
              <div className="text-[11px] text-slate-500">
                {task.executor?.email}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <User size={12} />
                Автор (Руководитель)
              </span>
              <div className="font-medium text-slate-800">
                {task.author?.full_name || 'Руководство'}
              </div>
              <div className="text-[11px] text-slate-500">
                Создано: {formatDate(task.created_at)}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-1.5">
              Описание и техзадание
            </h3>
            <div className="p-3 bg-slate-50/50 border border-slate-200 rounded-md text-slate-700 leading-relaxed whitespace-pre-wrap">
              {task.description || 'Описание не указано.'}
            </div>
          </div>

          {/* ACTION BUTTONS: STRICT STATE MACHINE */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                <span>Действия по задаче</span>
                <span className="text-[11px] font-normal text-slate-500">
                  (доступно для вашей роли: {isDirector ? 'Руководитель' : 'Исполнитель'})
                </span>
              </h3>

              {isDirector && (
                <div className="flex items-center gap-1">
                  {onEditTask && (
                    <button
                      onClick={() => onEditTask(task)}
                      className="px-2 py-1 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded hover:bg-slate-50 text-[11px] flex items-center gap-1"
                    >
                      <Edit size={11} />
                      Редактировать
                    </button>
                  )}
                  <button
                    onClick={handleDeleteTask}
                    className="px-2 py-1 text-rose-600 hover:text-rose-700 bg-white border border-rose-200 rounded hover:bg-rose-50 text-[11px] flex items-center gap-1"
                  >
                    <Trash2 size={11} />
                    Удалить
                  </button>
                </div>
              )}
            </div>

            {/* Allowed action buttons */}
            {hasAnyAction ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* 1. Executor starts work: new -> in_progress or rework -> in_progress */}
                {canStartTask && (
                  <button
                    onClick={() => initiateTransition('in_progress')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Play size={13} />
                    {task.status === 'rework' ? 'Возобновить работу' : 'Взять в работу'}
                  </button>
                )}

                {/* 2. Executor sends for review: in_progress -> under_review */}
                {canSendToReview && (
                  <button
                    onClick={() => initiateTransition('under_review')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Send size={13} />
                    Отправить на проверку
                  </button>
                )}

                {/* 3. Director accepts task: under_review -> accepted */}
                {canAcceptTask && (
                  <button
                    onClick={() => initiateTransition('accepted')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <CheckCircle size={13} />
                    Принять задачу
                  </button>
                )}

                {/* 4. Director returns for rework: under_review -> rework */}
                {canReturnForRework && (
                  <button
                    onClick={() => initiateTransition('rework')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <RotateCcw size={13} />
                    Вернуть на доработку
                  </button>
                )}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 py-1">
                <ShieldAlert size={13} className="text-slate-400" />
                {task.status === 'accepted' ? (
                  <span>Задача успешно принята руководителем. Дальнейшие переходы не требуются.</span>
                ) : isExecutor && !isAssignedExecutor ? (
                  <span>Вы не являетесь назначенным исполнителем этой задачи.</span>
                ) : task.status === 'under_review' && isExecutor ? (
                  <span>Задача находится на проверке у руководителя. Ожидайте решения.</span>
                ) : (task.status === 'new' || task.status === 'in_progress' || task.status === 'rework') && isDirector ? (
                  <span>Задача находится на этапе выполнения исполнителем ({task.executor?.full_name}).</span>
                ) : (
                  <span>Нет доступных действий для текущего статуса.</span>
                )}
              </div>
            )}

            {/* Comment Box (shown when a transition is chosen) */}
            {pendingStatus && (
              <div className="mt-3 p-3 bg-white border border-indigo-200 rounded-md shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-indigo-900">
                    Переход в статус: <strong>{TASK_STATUS_META[pendingStatus]?.label}</strong>
                  </span>
                  <button
                    onClick={() => setPendingStatus(null)}
                    className="text-slate-400 hover:text-slate-600 text-[11px]"
                  >
                    Отмена
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 font-medium mb-1">
                    {pendingStatus === 'rework' ? (
                      <span className="text-rose-600 font-semibold">
                        Причина возврата на доработку (обязательно): *
                      </span>
                    ) : (
                      <span>Комментарий к действию (опционально):</span>
                    )}
                  </label>
                  <textarea
                    rows={2}
                    value={commentText}
                    onChange={(e) => {
                      setCommentText(e.target.value);
                      if (commentError) setCommentError(null);
                    }}
                    placeholder={
                      pendingStatus === 'rework'
                        ? 'Опишите выявленные дефекты или замечания...'
                        : 'Добавьте комментарий или примечание...'
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {commentError && (
                    <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                      {commentError}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPendingStatus(null)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={confirmTransition}
                    disabled={actionLoading}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium flex items-center gap-1"
                  >
                    {actionLoading ? 'Сохранение...' : 'Подтвердить смену статуса'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* HISTORY SECTION (2.4. Vazifalar tarixi) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
                <History size={14} className="text-slate-500" />
                История изменений (Аудит)
              </h3>
              <span className="text-[11px] text-slate-400">
                {history.length} {history.length === 1 ? 'запись' : 'записей'}
              </span>
            </div>

            {loadingHistory ? (
              <div className="py-4 text-center text-slate-400 text-xs">
                Загрузка истории...
              </div>
            ) : history.length === 0 ? (
              <div className="py-4 text-center text-slate-400 text-xs">
                История изменений пуста
              </div>
            ) : (
              <div className="space-y-2.5 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {history.map((item) => (
                  <div key={item.id} className="relative pl-8 text-xs">
                    {/* Timeline bullet */}
                    <div className="absolute left-2.5 top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-indigo-600 transform -translate-x-1/2"></div>

                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800">
                            {item.user?.full_name || 'Пользователь'}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                            ({item.user?.role === 'director' ? 'Руководитель' : 'Исполнитель'})
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock size={11} />
                          {formatDate(item.created_at)}
                        </span>
                      </div>

                      {/* Transition pills */}
                      <div className="flex items-center gap-1.5 text-[11px]">
                        {item.old_status ? (
                          <>
                            <span className="text-slate-500">
                              {TASK_STATUS_META[item.old_status]?.label}
                            </span>
                            <span className="text-slate-400">→</span>
                            <StatusBadge status={item.new_status} size="sm" showIcon={false} />
                          </>
                        ) : (
                          <span className="text-slate-500">
                            Создание задачи со статусом:{' '}
                            <StatusBadge status={item.new_status} size="sm" showIcon={false} />
                          </span>
                        )}
                      </div>

                      {/* Comment */}
                      {item.comment && (
                        <div
                          className={`mt-1.5 p-2 rounded text-[11px] flex items-start gap-1.5 ${
                            item.new_status === 'rework'
                              ? 'bg-rose-50 border border-rose-200 text-rose-800'
                              : 'bg-white border border-slate-200 text-slate-700'
                          }`}
                        >
                          <MessageSquare
                            size={12}
                            className={`shrink-0 mt-0.5 ${
                              item.new_status === 'rework' ? 'text-rose-500' : 'text-slate-400'
                            }`}
                          />
                          <p className="leading-relaxed whitespace-pre-wrap">{item.comment}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50 text-xs">
          <div className="text-slate-400 font-mono text-[11px]">
            Обновлено: {formatDate(task.updated_at)}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-md font-medium text-xs transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
