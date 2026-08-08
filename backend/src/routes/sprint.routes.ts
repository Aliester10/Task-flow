import { Router } from 'express';
import { getSprints, createSprint, updateSprint, deleteSprint, addTaskToSprint } from '../controllers/sprint.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireProjectMember, requireProjectRole } from '../middlewares/projectAccess.middleware';

const router = Router({ mergeParams: true });

router.use(authMiddleware, requireProjectMember);

router.get('/', getSprints);
router.post('/', requireProjectRole(['OWNER', 'ADMIN']), createSprint);
router.put('/:sprintId', requireProjectRole(['OWNER', 'ADMIN']), updateSprint);
router.delete('/:sprintId', requireProjectRole(['OWNER', 'ADMIN']), deleteSprint);
router.post('/:sprintId/add-task', requireProjectRole(['OWNER', 'ADMIN']), addTaskToSprint);

export default router;
