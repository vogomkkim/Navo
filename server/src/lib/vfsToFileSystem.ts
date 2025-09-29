import fs from "node:fs/promises";
import path from "node:path";
import { VfsNode } from "@/modules/projects/projects.types";

export interface VfsToFileSystemOptions {
  projectId: string;
  tempDir: string;
  cleanup?: boolean; // 작업 완료 후 임시 디렉토리 정리 여부
}

export class VfsToFileSystem {
  private tempDir: string;
  private projectId: string;
  private cleanup: boolean;

  constructor(options: VfsToFileSystemOptions) {
    this.projectId = options.projectId;
    this.tempDir = options.tempDir;
    this.cleanup = options.cleanup ?? true;
  }

  /**
   * VFS 노드들을 임시 디렉토리에 파일로 동기화
   */
  async syncVfsToTempDir(vfsNodes: VfsNode[]): Promise<string> {
    try {
      // 임시 디렉토리 생성
      await fs.mkdir(this.tempDir, { recursive: true });

      // 루트 노드 찾기
      const rootNode = vfsNodes.find((node) => node.parentId === null);
      if (!rootNode) {
        throw new Error("Root node not found in VFS");
      }

      // 노드 맵 생성 (빠른 조회를 위해)
      const nodeMap = new Map<string, VfsNode>(
        vfsNodes.map((node) => [node.id, node])
      );

      // 경로 맵 생성
      const pathMap = new Map<string, string>();
      this.buildPathMap(rootNode.id, nodeMap, pathMap);

      // 파일 시스템에 동기화
      await this.syncNodesToFileSystem(vfsNodes, nodeMap, pathMap);

      console.log(
        `[VfsToFileSystem] Successfully synced ${vfsNodes.length} nodes to ${this.tempDir}`
      );
      return this.tempDir;
    } catch (error) {
      console.error(`[VfsToFileSystem] Failed to sync VFS to temp dir:`, error);
      throw error;
    }
  }

  /**
   * 노드들의 경로 맵을 재귀적으로 생성
   */
  private buildPathMap(
    nodeId: string,
    nodeMap: Map<string, VfsNode>,
    pathMap: Map<string, string>
  ): string {
    if (pathMap.has(nodeId)) {
      return pathMap.get(nodeId)!;
    }

    const node = nodeMap.get(nodeId);
    if (!node) return "";

    if (node.parentId === null) {
      // 루트 노드
      pathMap.set(nodeId, "/");
      return "/";
    }

    const parentPath = this.buildPathMap(node.parentId, nodeMap, pathMap);
    const fullPath =
      parentPath === "/" ? `/${node.name}` : `${parentPath}/${node.name}`;
    pathMap.set(nodeId, fullPath);
    return fullPath;
  }

  /**
   * VFS 노드들을 실제 파일 시스템에 동기화
   */
  private async syncNodesToFileSystem(
    vfsNodes: VfsNode[],
    nodeMap: Map<string, VfsNode>,
    pathMap: Map<string, string>
  ): Promise<void> {
    // 디렉토리부터 생성 (순서 보장)
    const directories = vfsNodes.filter(
      (node) => node.nodeType === "DIRECTORY"
    );
    for (const dir of directories) {
      const vfsPath = pathMap.get(dir.id);
      if (vfsPath && vfsPath !== "/") {
        const fsPath = this.vfsPathToFsPath(vfsPath);
        await fs.mkdir(fsPath, { recursive: true });
        console.log(`[VfsToFileSystem] Created directory: ${fsPath}`);
      }
    }

    // 파일 생성
    const files = vfsNodes.filter((node) => node.nodeType === "FILE");
    for (const file of files) {
      const vfsPath = pathMap.get(file.id);
      if (vfsPath) {
        const fsPath = this.vfsPathToFsPath(vfsPath);
        const content = file.content || "";

        // 파일 디렉토리 생성 (필요한 경우)
        const fileDir = path.dirname(fsPath);
        await fs.mkdir(fileDir, { recursive: true });

        // 파일 내용 쓰기
        await fs.writeFile(fsPath, content, "utf8");
        console.log(
          `[VfsToFileSystem] Created file: ${fsPath} (${content.length} bytes)`
        );
      }
    }
  }

  /**
   * VFS 경로를 실제 파일 시스템 경로로 변환
   */
  private vfsPathToFsPath(vfsPath: string): string {
    // VFS 경로: /src/app/page.tsx
    // 파일 시스템 경로: /tmp/navo-build-{projectId}/src/app/page.tsx

    const relativePath = vfsPath.startsWith("/") ? vfsPath.slice(1) : vfsPath;
    return path.join(this.tempDir, relativePath);
  }

  /**
   * 임시 디렉토리 정리
   */
  async cleanup(): Promise<void> {
    if (!this.cleanup) return;

    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
      console.log(
        `[VfsToFileSystem] Cleaned up temp directory: ${this.tempDir}`
      );
    } catch (error) {
      console.error(
        `[VfsToFileSystem] Failed to cleanup temp directory:`,
        error
      );
    }
  }

  /**
   * 임시 디렉토리 경로 반환
   */
  getTempDirPath(): string {
    return this.tempDir;
  }

  /**
   * 프로젝트 ID 반환
   */
  getProjectId(): string {
    return this.projectId;
  }
}

/**
 * 편의 함수: VFS를 임시 디렉토리에 동기화
 */
export async function syncVfsToTempDir(
  projectId: string,
  vfsNodes: VfsNode[],
  options?: { cleanup?: boolean }
): Promise<string> {
  const tempDir = `/tmp/navo-build-${projectId}-${Date.now()}`;
  const syncer = new VfsToFileSystem({
    projectId,
    tempDir,
    cleanup: options?.cleanup ?? true,
  });

  return await syncer.syncVfsToTempDir(vfsNodes);
}

/**
 * 편의 함수: VFS를 임시 디렉토리에 동기화하고 빌드 실행
 */
export async function syncVfsAndBuild(
  projectId: string,
  vfsNodes: VfsNode[],
  buildCommand: string = "npm run build"
): Promise<{ tempDir: string; buildOutput: string }> {
  const tempDir = `/tmp/navo-build-${projectId}-${Date.now()}`;
  const syncer = new VfsToFileSystem({
    projectId,
    tempDir,
    cleanup: false, // 빌드 후 수동으로 정리
  });

  try {
    // 1. VFS 동기화
    await syncer.syncVfsToTempDir(vfsNodes);

    // 2. 빌드 실행
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);

    console.log(`[VfsToFileSystem] Running build command: ${buildCommand}`);
    const { stdout, stderr } = await execAsync(buildCommand, { cwd: tempDir });

    if (stderr) {
      console.warn(`[VfsToFileSystem] Build warnings:`, stderr);
    }

    console.log(`[VfsToFileSystem] Build completed successfully`);

    return {
      tempDir,
      buildOutput: stdout,
    };
  } catch (error) {
    // 에러 발생 시 정리
    await syncer.cleanup();
    throw error;
  }
}
