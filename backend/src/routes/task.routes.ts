import { Router } from 'express';
import { getTasks, getTask, createTask, importTasks, updateTask, deleteTask, reorderTasks } from '../controllers/task.controller';
import { createComment, deleteComment } from '../controllers/comment.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

router.get('/', getTasks);
router.post('/', createTask);
router.post('/bulk', importTasks);
router.patch('/reorder', reorderTasks);
router.get('/:taskId', getTask);
router.put('/:taskId', updateTask);
router.delete('/:taskId', deleteTask);

// Comments nested under tasks
router.post('/:taskId/comments', createComment);
router.delete('/:taskId/comments/:commentId', deleteComment);

export default router;
