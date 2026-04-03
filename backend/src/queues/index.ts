import { Queue } from 'bullmq';
import { redis } from '../lib/redis';
import { QUEUE_NAMES } from './names';

export const consultationExecutionQueue = new Queue(QUEUE_NAMES.CONSULTATION_EXECUTION, {
  connection: redis,
});
