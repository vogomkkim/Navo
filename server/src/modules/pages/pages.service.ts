import { FastifyInstance } from 'fastify';
import { PagesRepositoryImpl } from './pages.repository';
import { ProjectsRepositoryImpl } from '../projects/projects.repository';
import { Page, CreatePageData, UpdatePageData } from './pages.types';

export class PagesService {
    private repository: PagesRepositoryImpl;
    private projectRepository: ProjectsRepositoryImpl;

    constructor(private readonly app: FastifyInstance) {
        this.repository = new PagesRepositoryImpl(app);
        this.projectRepository = new ProjectsRepositoryImpl(app);
    }

    async listPages(projectId: string, userId: string): Promise<Page[]> {
        try {
            // 프로젝트 소유권 확인
            const project = await this.projectRepository.getProjectByUserId(projectId, userId);
            if (!project) {
                throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
            }

            return await this.repository.listPagesByProjectId(projectId);
        } catch (error) {
            this.app.log.error(error, '페이지 목록 조회 실패');
            throw new Error('페이지 목록 조회에 실패했습니다.');
        }
    }

    async getPage(pageId: string, userId: string): Promise<Page> {
        try {
            const page = await this.repository.getPageById(pageId);
            if (!page) {
                throw new Error('페이지를 찾을 수 없습니다.');
            }

            // 프로젝트 소유권 확인
            const project = await this.projectRepository.getProjectByUserId(page.projectId, userId);
            if (!project) {
                throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
            }

            return page;
        } catch (error) {
            this.app.log.error(error, '페이지 조회 실패');
            throw new Error('페이지 조회에 실패했습니다.');
        }
    }

    async getPageByPath(projectId: string, path: string, userId: string): Promise<Page> {
        try {
            // 프로젝트 소유권 확인
            const project = await this.projectRepository.getProjectByUserId(projectId, userId);
            if (!project) {
                throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
            }

            const page = await this.repository.getPageByPath(projectId, path);
            if (!page) {
                throw new Error('페이지를 찾을 수 없습니다.');
            }

            return page;
        } catch (error) {
            this.app.log.error(error, '경로별 페이지 조회 실패');
            throw new Error('경로별 페이지 조회에 실패했습니다.');
        }
    }

    async createPage(pageData: CreatePageData, userId: string): Promise<Page> {
        try {
            // 프로젝트 소유권 확인
            const project = await this.projectRepository.getProjectByUserId(pageData.projectId, userId);
            if (!project) {
                throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
            }

            // 경로 중복 확인
            const existingPage = await this.repository.getPageByPath(pageData.projectId, pageData.path);
            if (existingPage) {
                throw new Error('이미 존재하는 경로입니다.');
            }

            return await this.repository.createPage(pageData);
        } catch (error) {
            this.app.log.error(error, '페이지 생성 실패');
            throw new Error('페이지 생성에 실패했습니다.');
        }
    }

    async updatePage(pageId: string, pageData: UpdatePageData, userId: string): Promise<Page> {
        try {
            const page = await this.repository.getPageById(pageId);
            if (!page) {
                throw new Error('페이지를 찾을 수 없습니다.');
            }

            // 프로젝트 소유권 확인
            const project = await this.projectRepository.getProjectByUserId(page.projectId, userId);
            if (!project) {
                throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
            }

            return await this.repository.updatePage(pageId, pageData);
        } catch (error) {
            this.app.log.error(error, '페이지 업데이트 실패');
            throw new Error('페이지 업데이트에 실패했습니다.');
        }
    }

    async deletePage(pageId: string, userId: string): Promise<void> {
        try {
            const page = await this.repository.getPageById(pageId);
            if (!page) {
                throw new Error('페이지를 찾을 수 없습니다.');
            }

            // 프로젝트 소유권 확인
            const project = await this.projectRepository.getProjectByUserId(page.projectId, userId);
            if (!project) {
                throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
            }

            await this.repository.deletePage(pageId);
        } catch (error) {
            this.app.log.error(error, '페이지 삭제 실패');
            throw new Error('페이지 삭제에 실패했습니다.');
        }
    }

    async publishPage(pageId: string, userId: string): Promise<Page> {
        try {
            const page = await this.repository.getPageById(pageId);
            if (!page) {
                throw new Error('페이지를 찾을 수 없습니다.');
            }

            // 프로젝트 소유권 확인
            const project = await this.projectRepository.getProjectByUserId(page.projectId, userId);
            if (!project) {
                throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
            }

            return await this.repository.updatePage(pageId, { isPublished: true });
        } catch (error) {
            this.app.log.error(error, '페이지 발행 실패');
            throw new Error('페이지 발행에 실패했습니다.');
        }
    }

    async unpublishPage(pageId: string, userId: string): Promise<Page> {
        try {
            const page = await this.repository.getPageById(pageId);
            if (!page) {
                throw new Error('페이지를 찾을 수 없습니다.');
            }

            // 프로젝트 소유권 확인
            const project = await this.projectRepository.getProjectByUserId(page.projectId, userId);
            if (!project) {
                throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
            }

            return await this.repository.updatePage(pageId, { isPublished: false });
        } catch (error) {
            this.app.log.error(error, '페이지 발행 해제 실패');
            throw new Error('페이지 발행 해제에 실패했습니다.');
        }
    }
}
