export class IntentAnalysis {
  constructor(intent, confidence, entities = []) {
    this.intent = intent;
    this.confidence = confidence;
    this.entities = entities;
  }
}

export class EnhancedPrompt {
  constructor(content, metadata = {}) {
    this.content = content;
    this.metadata = metadata;
  }
}
