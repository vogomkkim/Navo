import { Router } from 'express';
import {
  handleHealthCheck,
  handleDbTest,
} from '../handlers/healthAndDbTestHandlers.js';

const router = Router();

router.get('/', handleHealthCheck);
router.get('/db-test', handleDbTest);

export default router;
