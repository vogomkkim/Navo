import { NextFunction, Request, Response } from 'express';
import logger from '../core/logger.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
	logger.error('Unhandled error', err instanceof Error ? { message: err.message, stack: err.stack } : { err });
	res.status(500).json({ error: 'Internal Server Error' });
}

export function asyncHandler<Req extends Request = Request, Res extends Response = Response>(
	fn: (req: Req, res: Res) => Promise<unknown>
) {
	return function wrapped(req: Req, res: Res, next: NextFunction) {
		fn(req, res).catch(next);
	};
}
