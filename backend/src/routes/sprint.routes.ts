import { Router } from 'express';
import { getSprints, createSprint, updateSprint, deleteSprint, addTaskToSprint } from '../controllers/sprint.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

router.get('/', getSprints);
router.post('/', createSprint);
router.put('/:sprintId', updateSprint);
router.delete('/:sprintId', deleteSprint);
router.post('/:sprintId/add-task', addTaskToSprint);

export default router;
