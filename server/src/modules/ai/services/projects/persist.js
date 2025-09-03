export async function persistProject(projectData) {
  // 프로젝트 저장 로직
  return {
    id: 'project-' + Date.now(),
    ...projectData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function persistProjectPlan(planData) {
  // 프로젝트 계획 저장 로직
  return {
    id: 'plan-' + Date.now(),
    ...planData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
