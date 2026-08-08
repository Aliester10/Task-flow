import { Router } from 'express';
import {
  getProjects, getProject, createProject, updateProject,
  deleteProject, archiveProject, inviteMember, removeMember,
} from '../controllers/project.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireProjectRole } from '../middlewares/projectAccess.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getProjects);
router.post('/', createProject);
router.get('/:id', getProject);
router.put('/:id', requireProjectRole(['OWNER']), updateProject);
router.delete('/:id', requireProjectRole(['OWNER']), deleteProject);
router.patch('/:id/archive', requireProjectRole(['OWNER']), archiveProject);
router.post('/:id/members', requireProjectRole(['OWNER', 'ADMIN']), inviteMember);
router.delete('/:id/members/:userId', requireProjectRole(['OWNER', 'ADMIN']), removeMember);

export default router;
