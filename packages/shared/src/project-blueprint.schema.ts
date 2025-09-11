import { z } from 'zod';

// Schema for a single file node in the file structure
const FileNodeSchema = z.object({
  type: z.literal('file'),
  name: z.string(),
  content: z.string().optional(),
});

// Schema for a folder node, which can contain other nodes (recursive)
// We use z.lazy() to handle the recursive type definition.
type FolderNode = {
  type: 'folder';
  name: string;
  children: (FileNode | FolderNode)[];
};

const FolderNodeSchema: z.ZodType<FolderNode> = z.lazy(() =>
  z.object({
    type: z.literal('folder'),
    name: z.string(),
    children: z.array(z.union([FileNodeSchema, FolderNodeSchema])),
  })
);

// Union type for any node in the file structure
const FileStructureNodeSchema = z.union([FileNodeSchema, FolderNodeSchema]);

// Schema for a page
const PageSchema = z.object({
  name: z.string(),
  path: z.string().startsWith('/'),
  description: z.string(),
});

// Schema for a component
const ComponentSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string(),
  // props: z.record(z.string()).optional(), // Can be more detailed later
});

// The main Project Blueprint schema
export const ProjectBlueprintSchema = z.object({
  project: z.object({
    name: z.string(),
    description: z.string(),
    type: z.string().describe('e.g., web-application, mobile-app'),
    pages: z.array(PageSchema),
    components: z.array(ComponentSchema),
    file_structure: FolderNodeSchema,
  }),
});

// Export the inferred TypeScript type for convenience
export type ProjectBlueprint = z.infer<typeof ProjectBlueprintSchema>;
