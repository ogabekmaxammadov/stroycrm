import React from 'react';
import { TaskStatus, TASK_STATUS_META } from '../types';
import { Circle, PlayCircle, Eye, CheckCircle2, RotateCcw } from 'lucide-react';

interface StatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const meta = TASK_STATUS_META[status] || TASK_STATUS_META.new;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-medium px-3 py-1.5 gap-2',
  }[size];

  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14;

  const renderIcon = () => {
    switch (status) {
      case 'new':
        return <Circle size={iconSize} className="stroke-[2.5]" />;
      case 'in_progress':
        return <PlayCircle size={iconSize} className="stroke-[2.5]" />;
      case 'under_review':
        return <Eye size={iconSize} className="stroke-[2.5]" />;
      case 'accepted':
        return <CheckCircle2 size={iconSize} className="stroke-[2.5]" />;
      case 'rework':
        return <RotateCcw size={iconSize} className="stroke-[2.5]" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border ${meta.bgColor} ${meta.borderColor} ${meta.textColor} ${sizeClasses}`}
      title={meta.description}
    >
      {showIcon && renderIcon()}
      <span>{meta.label}</span>
    </span>
  );
};
