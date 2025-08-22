/**
 * 에러 해결 시스템 테스트 파일
 *
 * 이 파일을 실행하여 자동 에러 해결 시스템이 제대로 작동하는지 테스트할 수 있습니다.
 */

import { ErrorResolutionManager } from './core/errorResolution.js';
import { ErrorAnalyzerAgent } from './agents/errorAnalyzerAgent.js';

// 테스트용 에러 생성 함수
function createTestError(
  type: 'null_reference' | 'element_not_found' | 'network_error'
): Error {
  switch (type) {
    case 'null_reference':
      return new Error("Cannot read property 'innerHTML' of null");
    case 'element_not_found':
      return new Error("Element with id 'componentList' not found");
    case 'network_error':
      return new Error('Failed to fetch: Network error');
    default:
      return new Error('Unknown error occurred');
  }
}

// 테스트용 컨텍스트 생성
function createTestContext(): any {
  return {
    timestamp: new Date(),
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    url: 'http://localhost:3000',
    projectId: 'test-project-123',
    sessionId: 'test-session-456',
  };
}

// 메인 테스트 함수
async function testErrorResolutionSystem() {
  console.log('🚀 에러 해결 시스템 테스트 시작...\n');

  try {
    // 에러 해결 관리자 생성
    const manager = new ErrorResolutionManager();

    // Error Analyzer Agent 등록
    const analyzerAgent = new ErrorAnalyzerAgent();
    manager.registerAgent(analyzerAgent);

    console.log('✅ 에이전트 등록 완료');
    console.log(
      `📊 등록된 에이전트 수: ${manager.getStatus().registeredAgents}\n`
    );

    // 다양한 에러 타입 테스트
    const testErrors = [
      { type: 'null_reference', description: 'Null Reference 에러' },
      { type: 'element_not_found', description: 'Element Not Found 에러' },
      { type: 'network_error', description: 'Network 에러' },
    ];

    for (const testCase of testErrors) {
      console.log(`🔍 테스트: ${testCase.description}`);
      console.log('─'.repeat(50));

      const error = createTestError(testCase.type as any);
      const context = createTestContext();

      console.log(`에러 메시지: ${error.message}`);
      console.log(`발생 시간: ${context.timestamp.toISOString()}`);

      // 에러 해결 시도
      const result = await manager.resolveError(error, context);

      console.log(`\n📋 해결 결과:`);
      console.log(`  - 성공: ${result.success ? '✅' : '❌'}`);
      console.log(`  - 실행 시간: ${result.executionTime}ms`);
      console.log(`  - 변경사항 수: ${result.changes.length}`);

      if (result.errorMessage) {
        console.log(`  - 에러 메시지: ${result.errorMessage}`);
      }

      if (result.nextSteps && result.nextSteps.length > 0) {
        console.log(`  - 다음 단계:`);
        result.nextSteps.forEach((step, index) => {
          console.log(`    ${index + 1}. ${step}`);
        });
      }

      console.log('\n');
    }

    console.log('🎉 모든 테스트 완료!');
  } catch (error) {
    console.error('❌ 테스트 실행 중 오류 발생:', error);
  }
}

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  testErrorResolutionSystem().catch(console.error);
}

export { testErrorResolutionSystem };
