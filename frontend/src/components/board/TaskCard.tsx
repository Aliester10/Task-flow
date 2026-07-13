import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, Calendar, AlertCircle } from 'lucide-react';
import { Task } from '../../types';
import { formatDate, isOverdue } from '../../utils';
import { Avatar } from '../ui/Avatar';
import { PriorityIcon, StatusIcon, TaskTypeIcon } from '../ui/StatusIcon';

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(task)}
      role="button"
      tabIndex={0}
      aria-label={`Task: ${task.title}`}
      className={`bg-white border rounded-lg p-3 cursor-pointer group select-none
        transition-all duration-150 outline-none
        ${isDragging
          ? 'opacity-40 shadow-2xl scale-[1.02] rotate-1 ring-2 ring-blue-400 z-50'
          : 'border-gray-200 hover:bg-[#F8F9FA] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400'
        }`}
    >
      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-blue-100 text-blue-700"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-[13px] font-normal text-gray-800 leading-snug mb-3 group-hover:text-gray-900">
        {task.title}
      </p>

      {/* Footer row — mirip Jira */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: type + priority + due */}
        <div className="flex items-center gap-1.5">
          {/* Task type icon */}
          <TaskTypeIcon type="task" size={14} />

          {/* Priority icon */}
          <PriorityIcon priority={task.priority} size={14} />

          {/* Due date */}
          {task.dueDate && (
            <span className={`flex items-center gap-0.5 text-[11px] font-medium ml-1
              ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
              {overdue && <AlertCircle className="w-2.5 h-2.5" />}
              <Calendar className="w-2.5 h-2.5" />
              {formatDate(task.dueDate)}
            </span>
          )}

          {/* Comment count */}
          {(task._count?.comments ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-gray-400 ml-1">
              <MessageSquare className="w-2.5 h-2.5" />
              {task._count?.comments}
            </span>
          )}
        </div>

        {/* Right: assignee avatar */}
        {task.assignee ? (
          <Avatar
            name={task.assignee.name}
            avatarUrl={task.assignee.avatarUrl}
            size="xs"
            showTooltip
          />
        ) : (
          /* Empty assignee placeholder like Jira */
          <div className="w-5 h-5 rounded-full border border-dashed border-gray-300 flex items-center justify-center opacity-0 group-hover:opacity-60 transition-opacity">
            <span className="text-[8px] text-gray-400">+</span>
          </div>
        )}
      </div>
    </div>
  );
};
