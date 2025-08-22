/**
 * 통합 에러 해결 시스템 테스트 파일
 *
 * 모든 에이전트를 통합하여 자동 에러 해결 시스템이 제대로 작동하는지 테스트합니다.
 */

import { ErrorResolutionManager } from './core/errorResolution.js';
import { ErrorAnalyzerAgent } from './agents/errorAnalyzerAgent.js';
import { CodeFixerAgent } from './agents/codeFixerAgent.js';
import { TestRunnerAgent } from './agents/testRunnerAgent.js';
import { RollbackAgent } from './agents/rollbackAgent.js';

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

// 통합 에러 해결 테스트
async function testIntegratedErrorResolution() {
  console.log('🚀 통합 에러 해결 시스템 테스트 시작...\n');

  try {
    // 에러 해결 관리자 생성
    const manager = new ErrorResolutionManager();

    // 모든 에이전트 등록
    console.log('📝 에이전트 등록 중...');

    const analyzerAgent = new ErrorAnalyzerAgent();
    const codeFixerAgent = new CodeFixerAgent();
    const testRunnerAgent = new TestRunnerAgent();
    const rollbackAgent = new RollbackAgent();

    manager.registerAgent(analyzerAgent);
    manager.registerAgent(codeFixerAgent);
    manager.registerAgent(testRunnerAgent);
    manager.registerAgent(rollbackAgent);

    console.log('✅ 모든 에이전트 등록 완료');
    console.log(
      `📊 등록된 에이전트 수: ${manager.getStatus().registeredAgents}\n`
    );

    // 다양한 에러 타입 테스트
    const testErrors = [
      {
        type: 'null_reference',
        description: 'Null Reference 에러 (자동 수정 가능)',
      },
      {
        type: 'element_not_found',
        description: 'Element Not Found 에러 (자동 수정 가능)',
      },
      { type: 'network_error', description: 'Network 에러 (수동 개입 필요)' },
    ];

    for (const testCase of testErrors) {
      console.log(`🔍 테스트: ${testCase.description}`);
      console.log('─'.repeat(60));

      const error = createTestError(testCase.type as any);
      const context = createTestContext();

      console.log(`에러 메시지: ${error.message}`);
      console.log(`발생 시간: ${context.timestamp.toISOString()}`);

      // 1단계: 에러 분석
      console.log('\n📋 1단계: 에러 분석');
      const analysisResult = await manager.resolveError(error, context);

      if (analysisResult.success) {
        console.log('  ✅ 에러 분석 완료');
        console.log(`  - 다음 단계: ${analysisResult.nextSteps?.join(', ')}`);
      } else {
        console.log('  ❌ 에러 분석 실패');
        console.log(`  - 에러: ${analysisResult.errorMessage}`);
        continue;
      }

      // 2단계: 코드 수정 (자동 수정 가능한 에러인 경우)
      if (testCase.type !== 'network_error') {
        console.log('\n📋 2단계: 코드 수정');
        const fixResult = await manager.resolveError(error, context);

        if (fixResult.success) {
          console.log('  ✅ 코드 수정 완료');
          console.log(`  - 변경사항 수: ${fixResult.changes.length}`);
          console.log(`  - 실행 시간: ${fixResult.executionTime}ms`);
        } else {
          console.log('  ❌ 코드 수정 실패');
          console.log(`  - 에러: ${fixResult.errorMessage}`);
        }
      }

      // 3단계: 에러 해결 확인
      console.log('\n📋 3단계: 에러 해결 확인');
      const testResult = await manager.resolveError(error, context);

      if (testResult.success) {
        console.log('  ✅ 에러 해결 확인 완료');
        console.log(`  - 실행 시간: ${testResult.executionTime}ms`);
      } else {
        console.log('  ❌ 에러 해결 확인 실패');
        console.log(`  - 에러: ${testResult.errorMessage}`);
      }

      console.log('\n');
    }

    console.log('🎉 모든 통합 테스트 완료!');

    // 최종 상태 출력
    const finalStatus = manager.getStatus();
    console.log('\n📊 최종 시스템 상태:');
    console.log(`  - 처리 중: ${finalStatus.isProcessing ? '예' : '아니오'}`);
    console.log(`  - 등록된 에이전트: ${finalStatus.registeredAgents}개`);
  } catch (error) {
    console.error('❌ 통합 테스트 실행 중 오류 발생:', error);
  }
}

// 개별 에이전트 테스트
async function testIndividualAgents() {
  console.log('\n🔧 개별 에이전트 테스트...\n');

  try {
    // Error Analyzer Agent 테스트
    console.log('📝 Error Analyzer Agent 테스트');
    const analyzerAgent = new ErrorAnalyzerAgent();
    const testError = createTestError('null_reference');
    const testContext = createTestContext();

    const analysisResult = await analyzerAgent.execute(testError, testContext);
    console.log(`  - 성공: ${analysisResult.success ? '✅' : '❌'}`);
    console.log(`  - 실행 시간: ${analysisResult.executionTime}ms`);

    // Code Fixer Agent 테스트
    console.log('\n📝 Code Fixer Agent 테스트');
    const codeFixerAgent = new CodeFixerAgent();
    const fixResult = await codeFixerAgent.execute(testError, testContext);
    console.log(`  - 성공: ${fixResult.success ? '✅' : '❌'}`);
    console.log(`  - 변경사항: ${fixResult.changes.length}개`);

    // Test Runner Agent 테스트
    console.log('\n📝 Test Runner Agent 테스트');
    const testRunnerAgent = new TestRunnerAgent();
    const testResult = await testRunnerAgent.execute(testError, testContext);
    console.log(`  - 성공: ${testResult.success ? '✅' : '❌'}`);
    console.log(`  - 실행 시간: ${testResult.executionTime}ms`);

    // Rollback Agent 테스트
    console.log('\n📝 Rollback Agent 테스트');
    const rollbackAgent = new RollbackAgent();
    const rollbackResult = await rollbackAgent.execute(testError, testContext);
    console.log(`  - 성공: ${rollbackResult.success ? '✅' : '❌'}`);
    console.log(`  - 실행 시간: ${rollbackResult.executionTime}ms`);
  } catch (error) {
    console.error('❌ 개별 에이전트 테스트 실패:', error);
  }
}

// 메인 테스트 실행
async function runAllTests() {
  console.log('🧪 자동 에러 해결 시스템 전체 테스트 시작\n');

  // 1. 통합 테스트
  await testIntegratedErrorResolution();

  // 2. 개별 에이전트 테스트
  await testIndividualAgents();

  console.log('\n🎯 모든 테스트 완료!');
  console.log('\n📋 다음 단계:');
  console.log('  1. 실제 브라우저 환경에서 테스트');
  console.log('  2. 다양한 에러 시나리오 추가');
  console.log('  3. 성능 최적화 및 안정성 개선');
}

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { testIntegratedErrorResolution, testIndividualAgents, runAllTests };
