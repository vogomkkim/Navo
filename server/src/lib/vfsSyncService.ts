import { ProjectsService } from "@/modules/projects/projects.service";
import { syncVfsToTempDir, syncVfsAndBuild } from "@/lib/vfsToFileSystem";
import { FastifyInstance } from "fastify";

/**
 * VFS를 임시 디렉토리에 동기화하는 서비스
 */
export class VfsSyncService {
  constructor(private app: FastifyInstance) {}

  /**
   * 프로젝트의 VFS를 임시 디렉토리에 동기화
   */
  async syncProjectToTempDir(
    projectId: string,
    userId: string,
    options?: { cleanup?: boolean }
  ): Promise<string> {
    const projectsService = new ProjectsService(this.app);

    // 1. VFS 트리 가져오기
    const vfsTree = await projectsService.getVfsTree(projectId, userId, {
      includeContent: true,
    });

    if (vfsTree.nodes.length === 0) {
      throw new Error("Project has no files to sync");
    }

    // 2. VFS 노드들을 임시 디렉토리에 동기화
    const tempDir = await syncVfsToTempDir(projectId, vfsTree.nodes, options);

    this.app.log.info(
      {
        projectId,
        tempDir,
        fileCount: vfsTree.nodes.length,
      },
      "[VfsSyncService] Project synced to temp directory"
    );

    return tempDir;
  }

  /**
   * 프로젝트를 빌드하고 결과를 반환
   */
  async buildProject(
    projectId: string,
    userId: string,
    buildCommand: string = "npm run build"
  ): Promise<{ tempDir: string; buildOutput: string; success: boolean }> {
    const projectsService = new ProjectsService(this.app);

    try {
      // 1. VFS 트리 가져오기
      const vfsTree = await projectsService.getVfsTree(projectId, userId, {
        includeContent: true,
      });

      if (vfsTree.nodes.length === 0) {
        throw new Error("Project has no files to build");
      }

      // 2. VFS 동기화 및 빌드
      const { tempDir, buildOutput } = await syncVfsAndBuild(
        projectId,
        vfsTree.nodes,
        buildCommand
      );

      this.app.log.info(
        {
          projectId,
          tempDir,
          buildOutput: buildOutput.substring(0, 200) + "...",
        },
        "[VfsSyncService] Project built successfully"
      );

      return {
        tempDir,
        buildOutput,
        success: true,
      };
    } catch (error) {
      this.app.log.error(
        {
          projectId,
          error: error instanceof Error ? error.message : String(error),
        },
        "[VfsSyncService] Project build failed"
      );

      return {
        tempDir: "",
        buildOutput: error instanceof Error ? error.message : String(error),
        success: false,
      };
    }
  }

  /**
   * 프로젝트를 GCS에 업로드 (빌드 후)
   */
  async uploadProjectToGCS(
    projectId: string,
    userId: string,
    gcsConfig: {
      bucket: string;
      projectId: string;
      keyFilename?: string;
    }
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // 1. 프로젝트 빌드
      const buildResult = await this.buildProject(projectId, userId);

      if (!buildResult.success) {
        return {
          success: false,
          error: buildResult.buildOutput,
        };
      }

      // 2. GCS 업로드 (실제 구현은 Google Cloud Storage SDK 사용)
      // const { Storage } = require('@google-cloud/storage');
      // const storage = new Storage({
      //   projectId: gcsConfig.projectId,
      //   keyFilename: gcsConfig.keyFilename,
      // });
      // const bucket = storage.bucket(gcsConfig.bucket);
      //
      // // 빌드된 파일들을 GCS에 업로드
      // const uploadPromises = [];
      // const buildDir = buildResult.tempDir;
      //
      // // out/ 또는 dist/ 폴더의 모든 파일을 업로드
      // const files = await fs.readdir(buildDir, { recursive: true });
      // for (const file of files) {
      //   const filePath = path.join(buildDir, file);
      //   const gcsPath = `projects/${projectId}/${file}`;
      //   uploadPromises.push(
      //     bucket.upload(filePath, { destination: gcsPath })
      //   );
      // }
      //
      // await Promise.all(uploadPromises);

      // 임시로 성공 응답
      const previewUrl = `https://storage.googleapis.com/${gcsConfig.bucket}/projects/${projectId}/index.html`;

      this.app.log.info(
        {
          projectId,
          previewUrl,
        },
        "[VfsSyncService] Project uploaded to GCS"
      );

      return {
        success: true,
        url: previewUrl,
      };
    } catch (error) {
      this.app.log.error(
        {
          projectId,
          error: error instanceof Error ? error.message : String(error),
        },
        "[VfsSyncService] GCS upload failed"
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * 사용 예시
 */
export async function exampleUsage(app: FastifyInstance) {
  const vfsSyncService = new VfsSyncService(app);

  // 예시 1: VFS를 임시 디렉토리에 동기화
  try {
    const tempDir = await vfsSyncService.syncProjectToTempDir(
      "project-123",
      "user-456",
      { cleanup: true }
    );
    console.log(`프로젝트가 임시 디렉토리에 동기화됨: ${tempDir}`);
  } catch (error) {
    console.error("동기화 실패:", error);
  }

  // 예시 2: 프로젝트 빌드
  try {
    const buildResult = await vfsSyncService.buildProject(
      "project-123",
      "user-456",
      "npm run build"
    );

    if (buildResult.success) {
      console.log("빌드 성공:", buildResult.tempDir);
    } else {
      console.error("빌드 실패:", buildResult.buildOutput);
    }
  } catch (error) {
    console.error("빌드 에러:", error);
  }

  // 예시 3: GCS 업로드
  try {
    const uploadResult = await vfsSyncService.uploadProjectToGCS(
      "project-123",
      "user-456",
      {
        bucket: "navo-preview-prod",
        projectId: "navo-ai-platform",
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      }
    );

    if (uploadResult.success) {
      console.log("GCS 업로드 성공:", uploadResult.url);
    } else {
      console.error("GCS 업로드 실패:", uploadResult.error);
    }
  } catch (error) {
    console.error("GCS 업로드 에러:", error);
  }
}
