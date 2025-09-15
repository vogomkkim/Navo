import { db } from '@/db/db.instance';
import { projects, vfsNodes } from '@/drizzle/schema';
import { VfsRepositoryImpl } from '@/modules/projects/vfs.repository';
import { eq, isNull, and } from 'drizzle-orm';

async function main() {
  console.log('Starting VFS root node verification script...');

  const vfsRepo = new VfsRepositoryImpl({ log: console } as any);
  const allProjects = await db.select().from(projects);

  if (allProjects.length === 0) {
    console.log('No projects found. Exiting.');
    return;
  }

  console.log(`Found ${allProjects.length} projects to check.`);

  let fixedCount = 0;
  for (const project of allProjects) {
    console.log(`Checking project: ${project.name} (${project.id})`);

    const rootNode = await db
      .select()
      .from(vfsNodes)
      .where(and(eq(vfsNodes.projectId, project.id), isNull(vfsNodes.parentId)));

    if (rootNode.length === 0) {
      console.log(`  -> Root node not found. Creating one...`);
      await vfsRepo.createRootNode(project.id);
      console.log(`  -> Successfully created root node.`);
      fixedCount++;
    } else {
      console.log(`  -> Root node already exists. Skipping.`);
    }
  }

  console.log('Script finished.');
  console.log(`Total projects checked: ${allProjects.length}`);
  console.log(`Projects fixed: ${fixedCount}`);
}

main().catch((err) => {
  console.error('An error occurred:', err);
  process.exit(1);
});
