-- tasks: query paling sering (getTasks, dashboard, groupBy)
CREATE INDEX idx_tasks_project_status     ON tasks (project_id, status);
CREATE INDEX idx_tasks_project_due_status ON tasks (project_id, due_date, status) WHERE status != 'DONE';
CREATE INDEX idx_tasks_assignee           ON tasks (assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX idx_tasks_sprint             ON tasks (sprint_id)   WHERE sprint_id IS NOT NULL;

-- activity_logs: pagination di getTask
CREATE INDEX idx_activity_logs_task_created ON activity_logs (task_id, created_at DESC);

-- notifications: getNotifications + cleanup
CREATE INDEX idx_notifications_user_read_created ON notifications (user_id, is_read, created_at DESC);

-- sprints: query per project
CREATE INDEX idx_sprints_project_id ON sprints (project_id);