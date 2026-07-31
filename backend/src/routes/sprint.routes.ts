import { Router } from 'express';
import { getSprints, createSprint, updateSprint, deleteSprint, addTaskToSprint } from '../controllers/sprint.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireProjectMember } from '../middlewares/projectAccess.middleware';

const router = Router({ mergeParams: true });

router.use(authMiddleware, requireProjectMember);

router.get('/', getSprints);
router.post('/', createSprint);
router.put('/:sprintId', updateSprint);
router.delete('/:sprintId', deleteSprint);
router.post('/:sprintId/add-task', addTaskToSprint);

export default router;
