import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import { handleLogin, handleRegister } from '../auth/auth.js';

async function authRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  fastify.post('/register', handleRegister);
  fastify.post('/login', handleLogin);
}

export default fp(authRoutes);
