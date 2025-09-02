import { FastifyInstance } from 'fastify';
import { db } from '@/db/db.instance';
import { componentDefinitions } from '@/drizzle/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { ComponentDefinition, CreateComponentDefinitionData, UpdateComponentDefinitionData, ComponentsRepository } from './components.types';

export class ComponentsRepositoryImpl implements ComponentsRepository {
    constructor(private readonly app: FastifyInstance) { }

    async listComponentDefinitions(projectId: string): Promise<ComponentDefinition[]> {
        try {
            const result = await db
                .select({
                    id: componentDefinitions.id,
                    name: componentDefinitions.name,
                    displayName: componentDefinitions.displayName,
                    description: componentDefinitions.description,
                    category: componentDefinitions.category,
                    propsSchema: componentDefinitions.propsSchema,
                    renderTemplate: componentDefinitions.renderTemplate,
                    cssStyles: componentDefinitions.cssStyles,
                    isActive: componentDefinitions.isActive,
                    projectId: componentDefinitions.projectId,
                    createdAt: componentDefinitions.createdAt,
                    updatedAt: componentDefinitions.updatedAt,
                })
                .from(componentDefinitions)
                .where(and(eq(componentDefinitions.projectId, projectId), eq(componentDefinitions.isActive, true)))
                .orderBy(asc(componentDefinitions.category), asc(componentDefinitions.displayName));

            this.app.log.info({ projectId, count: result.length }, '컴포넌트 정의 목록 조회 완료');
            return result;
        } catch (error) {
            this.app.log.error(error, '컴포넌트 정의 목록 조회 실패');
            throw new Error('컴포넌트 정의 목록 조회에 실패했습니다.');
        }
    }

    async getComponentDefinitionById(id: string): Promise<ComponentDefinition | null> {
        try {
            const result = await db
                .select({
                    id: componentDefinitions.id,
                    name: componentDefinitions.name,
                    displayName: componentDefinitions.displayName,
                    description: componentDefinitions.description,
                    category: componentDefinitions.category,
                    propsSchema: componentDefinitions.propsSchema,
                    renderTemplate: componentDefinitions.renderTemplate,
                    cssStyles: componentDefinitions.cssStyles,
                    isActive: componentDefinitions.isActive,
                    projectId: componentDefinitions.projectId,
                    createdAt: componentDefinitions.createdAt,
                    updatedAt: componentDefinitions.updatedAt,
                })
                .from(componentDefinitions)
                .where(eq(componentDefinitions.id, id))
                .limit(1);

            if (result.length === 0) {
                return null;
            }

            this.app.log.info({ id }, '컴포넌트 정의 조회 완료');
            return result[0];
        } catch (error) {
            this.app.log.error(error, '컴포넌트 정의 조회 실패');
            throw new Error('컴포넌트 정의 조회에 실패했습니다.');
        }
    }

    async getComponentDefinitionByName(name: string, projectId: string): Promise<ComponentDefinition | null> {
        try {
            const result = await db
                .select({
                    id: componentDefinitions.id,
                    name: componentDefinitions.name,
                    displayName: componentDefinitions.displayName,
                    description: componentDefinitions.description,
                    category: componentDefinitions.category,
                    propsSchema: componentDefinitions.propsSchema,
                    renderTemplate: componentDefinitions.renderTemplate,
                    cssStyles: componentDefinitions.cssStyles,
                    isActive: componentDefinitions.isActive,
                    projectId: componentDefinitions.projectId,
                    createdAt: componentDefinitions.createdAt,
                    updatedAt: componentDefinitions.updatedAt,
                })
                .from(componentDefinitions)
                .where(and(eq(componentDefinitions.name, name), eq(componentDefinitions.projectId, projectId), eq(componentDefinitions.isActive, true)))
                .limit(1);

            if (result.length === 0) {
                return null;
            }

            this.app.log.info({ name, projectId }, '이름별 컴포넌트 정의 조회 완료');
            return result[0];
        } catch (error) {
            this.app.log.error(error, '이름별 컴포넌트 정의 조회 실패');
            throw new Error('이름별 컴포넌트 정의 조회에 실패했습니다.');
        }
    }

    async createComponentDefinition(data: CreateComponentDefinitionData): Promise<ComponentDefinition> {
        try {
            const result = await db
                .insert(componentDefinitions)
                .values({
                    name: data.name,
                    displayName: data.displayName,
                    description: data.description,
                    category: data.category,
                    propsSchema: data.propsSchema,
                    renderTemplate: data.renderTemplate,
                    cssStyles: data.cssStyles,
                    isActive: true,
                    projectId: data.projectId,
                })
                .returning({
                    id: componentDefinitions.id,
                    name: componentDefinitions.name,
                    displayName: componentDefinitions.displayName,
                    description: componentDefinitions.description,
                    category: componentDefinitions.category,
                    propsSchema: componentDefinitions.propsSchema,
                    renderTemplate: componentDefinitions.renderTemplate,
                    cssStyles: componentDefinitions.cssStyles,
                    isActive: componentDefinitions.isActive,
                    projectId: componentDefinitions.projectId,
                    createdAt: componentDefinitions.createdAt,
                    updatedAt: componentDefinitions.updatedAt,
                });

            this.app.log.info({ id: result[0].id, projectId: data.projectId }, '컴포넌트 정의 생성 완료');
            return result[0];
        } catch (error) {
            this.app.log.error(error, '컴포넌트 정의 생성 실패');
            throw new Error('컴포넌트 정의 생성에 실패했습니다.');
        }
    }

    async updateComponentDefinition(id: string, data: UpdateComponentDefinitionData): Promise<ComponentDefinition> {
        try {
            const updateData: any = {
                updatedAt: new Date().toISOString(),
            };

            if (data.displayName !== undefined) updateData.displayName = data.displayName;
            if (data.description !== undefined) updateData.description = data.description;
            if (data.category !== undefined) updateData.category = data.category;
            if (data.propsSchema !== undefined) updateData.propsSchema = data.propsSchema;
            if (data.renderTemplate !== undefined) updateData.renderTemplate = data.renderTemplate;
            if (data.cssStyles !== undefined) updateData.cssStyles = data.cssStyles;
            if (data.isActive !== undefined) updateData.isActive = data.isActive;

            const result = await db
                .update(componentDefinitions)
                .set(updateData)
                .where(eq(componentDefinitions.id, id))
                .returning({
                    id: componentDefinitions.id,
                    name: componentDefinitions.name,
                    displayName: componentDefinitions.displayName,
                    description: componentDefinitions.description,
                    category: componentDefinitions.category,
                    propsSchema: componentDefinitions.propsSchema,
                    renderTemplate: componentDefinitions.renderTemplate,
                    cssStyles: componentDefinitions.cssStyles,
                    isActive: componentDefinitions.isActive,
                    projectId: componentDefinitions.projectId,
                    createdAt: componentDefinitions.createdAt,
                    updatedAt: componentDefinitions.updatedAt,
                });

            if (result.length === 0) {
                throw new Error('컴포넌트 정의를 찾을 수 없습니다.');
            }

            this.app.log.info({ id }, '컴포넌트 정의 업데이트 완료');
            return result[0];
        } catch (error) {
            this.app.log.error(error, '컴포넌트 정의 업데이트 실패');
            throw new Error('컴포넌트 정의 업데이트에 실패했습니다.');
        }
    }

    async deleteComponentDefinition(id: string): Promise<void> {
        try {
            // Soft delete by setting isActive to false
            await db
                .update(componentDefinitions)
                .set({ isActive: false, updatedAt: new Date().toISOString() })
                .where(eq(componentDefinitions.id, id));

            this.app.log.info({ id }, '컴포넌트 정의 삭제 완료');
        } catch (error) {
            this.app.log.error(error, '컴포넌트 정의 삭제 실패');
            throw new Error('컴포넌트 정의 삭제에 실패했습니다.');
        }
    }

    async seedComponentDefinitions(projectId: string, components: any[]): Promise<ComponentDefinition[]> {
        try {
            const result: ComponentDefinition[] = [];

            for (const component of components) {
                const existing = await this.getComponentDefinitionByName(component.name, projectId);

                if (existing) {
                    // Update existing component
                    const updated = await this.updateComponentDefinition(existing.id, {
                        displayName: component.display_name,
                        description: component.description,
                        category: component.category,
                        propsSchema: component.props_schema,
                        renderTemplate: component.render_template,
                        cssStyles: component.css_styles,
                        isActive: true,
                    });
                    result.push(updated);
                } else {
                    // Create new component
                    const created = await this.createComponentDefinition({
                        name: component.name,
                        displayName: component.display_name,
                        description: component.description,
                        category: component.category,
                        propsSchema: component.props_schema,
                        renderTemplate: component.render_template,
                        cssStyles: component.css_styles,
                        projectId,
                    });
                    result.push(created);
                }
            }

            this.app.log.info({ projectId, count: result.length }, '컴포넌트 정의 시드 완료');
            return result;
        } catch (error) {
            this.app.log.error(error, '컴포넌트 정의 시드 실패');
            throw new Error('컴포넌트 정의 시드에 실패했습니다.');
        }
    }
}
