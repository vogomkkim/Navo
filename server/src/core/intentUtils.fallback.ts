export function buildSystemInstruction(): string {
	return 'You are a helpful assistant.';
}

export function buildUserPrompt(message: string, _context: any): string {
	return message;
}

export function normalizeModelAnalysis(parsed: any): any {
	return {
		type: parsed?.type ?? 'general',
		confidence: parsed?.confidence ?? 0.5,
		description: parsed?.description ?? 'N/A',
		is_vague: parsed?.is_vague ?? false,
		targets: parsed?.targets ?? [],
		actions: parsed?.actions ?? [],
		required_fields: parsed?.required_fields ?? [],
		blocking_reasons: parsed?.blocking_reasons ?? [],
		routing_key: parsed?.routing_key ?? 'default',
		enhanced_message: parsed?.enhanced_message ?? undefined,
	};
}

export function decideExecution(normalized: any): any {
	return {
		status: 'auto',
		reason: 'fallback',
		missing: [],
	};
}