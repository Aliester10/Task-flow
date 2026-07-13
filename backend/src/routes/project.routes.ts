import { Router } from 'express';
import {
  getProjects, getProject, createProject, updateProject,
  deleteProject, archiveProject, inviteMember, removeMember,
} from '../controllers/project.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getProjects);
router.post('/', createProject);
router.get('/:id', getProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.patch('/:id/archive', archiveProject);
router.post('/:id/members', inviteMember);
router.delete('/:id/members/:userId', removeMember);

export default router;
