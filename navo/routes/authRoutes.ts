import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { handleLogin, handleRegister } from '../auth/auth.js';

async function authRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  fastify.post('/auth/register', handleRegister);
  fastify.post('/auth/login', handleLogin);
}

export default authRoutes;
