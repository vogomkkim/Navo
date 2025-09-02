export class ActionResult {
  constructor(success, data, error = null) {
    this.success = success;
    this.data = data;
    this.error = error;
  }

  static success(data) {
    return new ActionResult(true, data);
  }

  static error(error) {
    return new ActionResult(false, null, error);
  }
}

export const actionRouter = {
  routes: new Map(),

  register(action, handler) {
    this.routes.set(action, handler);
  },

  async route(action, context) {
    const handler = this.routes.get(action);
    if (handler) {
      return await handler(context);
    }
    return ActionResult.error(`Unknown action: ${action}`);
  }
};
