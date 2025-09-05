import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.max(0, Math.min(10, parseInt(limitParam))) : 3;

    const baseSuggestions = [
      { content: { title: '프로젝트 구조 개선', detail: '폴더 구조 정리 및 모듈 분리 제안' } },
      { content: { title: '테스트 추가', detail: '핵심 훅과 유틸에 단위 테스트 추가' } },
      { content: { title: '성능 최적화', detail: '인피니트 스크롤에 캐싱 전략 적용' } },
      { content: { title: '에러 처리', detail: 'Unauthorized 발생 시 자동 로그아웃 처리 확인' } },
      { content: { title: '문서화', detail: 'API 훅 사용 예시를 README에 추가' } },
    ];

    const suggestions = baseSuggestions.slice(0, limit);
    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json({ error: '제안 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

