import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const suggestion = {
      content: {
        title: '더미 제안',
        detail: '이 버튼은 통합 테스트를 위해 더미 제안을 생성합니다.',
      },
      createdAt: new Date().toISOString(),
    };
    return NextResponse.json({ ok: true, suggestion });
  } catch (error) {
    return NextResponse.json({ error: '더미 제안 생성 실패' }, { status: 500 });
  }
}

