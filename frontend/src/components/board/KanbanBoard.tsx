import React, { useState, useMemo } from 'react';
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  DragOverlay, closestCenter, pointerWithin, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Task, TaskStatus } from '../../types';
import { KANBAN_COLUMNS } from '../../utils';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { useTaskStore } from '../../store/task.store';

interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId, tasks, onTaskClick, onAddTask }) => {
  const { moveTask, updateTaskLocal } = useTaskStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      BACKLOG: [], TODO: [], IN_PROGRESS: [], REVIEW: [], DONE: [], BLOCKED: [],
    };
    tasks.forEach((t) => map[t.status].push(t));
    // Sort by order
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.order - b.order));
    return map;
  }, [tasks]);

  const handleDragStart = (e: DragStartEvent) => {
    const task = e.active.data.current?.task as Task;
    setActiveTask(task || null);
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Check if dropped over a column (status)
    const isOverColumn = KANBAN_COLUMNS.includes(overId as TaskStatus);
    if (isOverColumn && activeTask.status !== overId) {
      updateTaskLocal(activeId, { status: overId as TaskStatus });
    }
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    let newStatus: TaskStatus = activeTask.status;
    let newOrder = activeTask.order;

    if (KANBAN_COLUMNS.includes(overId as TaskStatus)) {
      newStatus = overId as TaskStatus;
      const colTasks = tasksByStatus[newStatus];
      newOrder = colTasks.length;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        newStatus = overTask.status;
        const colTasks = tasksByStatus[newStatus];
        const oldIdx = colTasks.findIndex((t) => t.id === activeId);
        const newIdx = colTasks.findIndex((t) => t.id === overId);
        const reordered = arrayMove(colTasks, oldIdx === -1 ? colTasks.length : oldIdx, newIdx);
        newOrder = reordered.findIndex((t) => t.id === activeId);
      }
    }

    await moveTask(projectId, activeId, newStatus, newOrder);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 px-1 min-h-[500px] group">
        {KANBAN_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="rotate-2 opacity-90">
            <TaskCard task={activeTask} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
