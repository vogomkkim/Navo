import { z } from 'zod';
export default z
    .object({
    blueprintType: z
        .literal('API_BLUEPRINT_V1')
        .describe('Schema version identifier.'),
    endpoints: z
        .array(z.object({
        path: z
            .string()
            .regex(new RegExp('^/'))
            .describe('The URL path of the endpoint.'),
        method: z
            .enum(['GET', 'POST', 'PATCH', 'DELETE'])
            .describe('The HTTP method.'),
        description: z.string(),
        request: z
            .object({
            params: z
                .record(z.object({ type: z.string(), description: z.string() }))
                .optional(),
            body: z
                .record(z.object({ type: z.string(), description: z.string() }))
                .optional(),
        })
            .optional(),
        response: z
            .record(z.object({
            description: z.string(),
            body: z
                .record(z.object({ type: z.string(), description: z.string() }))
                .optional(),
        }))
            .superRefine((value, ctx) => {
            for (const key in value) {
                if (key.match(new RegExp('^[1-5][0-9]{2}$'))) {
                    const result = z
                        .object({
                        description: z.string(),
                        body: z
                            .record(z.object({
                            type: z.string(),
                            description: z.string(),
                        }))
                            .optional(),
                    })
                        .safeParse(value[key]);
                    if (!result.success) {
                        ctx.addIssue({
                            path: [...ctx.path, key],
                            code: 'custom',
                            message: `Invalid input: Key matching regex /${key}/ must match schema`,
                            params: {
                                issues: result.error.issues,
                            },
                        });
                    }
                }
            }
        }),
    }))
        .min(1)
        .describe('An array of Endpoint Objects, each defining a single API endpoint.'),
})
    .describe('A standard schema for describing a backend API for generation by the Navo AI.');
