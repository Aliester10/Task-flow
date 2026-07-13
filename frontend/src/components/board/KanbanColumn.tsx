import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Task, TaskStatus } from '../../types';
import { STATUS_STYLES } from '../ui/Badge';
import { StatusIcon } from '../ui/StatusIcon';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status, tasks, onTaskClick, onAddTask,
}) => {
  const cfg = STATUS_STYLES[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col w-[268px] flex-shrink-0">
      {/* Column Header — Jira style */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-2">
          {/* Status icon */}
          <StatusIcon status={status} size={14} />

          {/* Label */}
          <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
            {cfg.label}
          </span>

          {/* Count bubble */}
          <span className="w-[18px] h-[18px] rounded-full bg-gray-100 text-gray-500
                           text-[10px] font-bold flex items-center justify-center">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAddTask(status)}
            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={`Tambah task`}
            title="Tambah task"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Opsi kolom"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[calc(100vh-240px)] rounded-lg p-1.5 space-y-1.5 transition-all duration-150
          ${isOver
            ? 'bg-blue-50 ring-2 ring-blue-300 ring-dashed'
            : 'bg-[#F4F5F7]'
          }`}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>

        {/* Drop indicator */}
        {isOver && (
          <div className="h-10 rounded-md border-2 border-dashed border-blue-400 bg-blue-50
                          flex items-center justify-center text-xs text-blue-500 font-medium">
            Lepaskan di sini
          </div>
        )}

        {/* Create button at bottom — like Jira */}
        <button
          onClick={() => onAddTask(status)}
          className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[12px]
                      text-gray-400 hover:text-gray-700 hover:bg-gray-200/70
                      transition-colors group/create
                      ${tasks.length === 0 && !isOver ? 'mt-0' : 'mt-1'}`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Buat issue</span>
        </button>
      </div>
    </div>
  );
};
