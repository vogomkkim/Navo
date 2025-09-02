export class ProjectRequest {
  constructor(name, description, type = 'web', features = []) {
    this.name = name;
    this.description = description;
    this.type = type;
    this.features = features;
  }
}

export class BaseAgent {
  constructor(name, priority = 5) {
    this.name = name;
    this.priority = priority;
  }

  canHandle(request) {
    return false;
  }

  async execute(request, context) {
    throw new Error('execute method must be implemented');
  }
}
