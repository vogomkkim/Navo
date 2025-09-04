import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = request.headers.get('authorization');

    // Fastify 백엔드로 요청 전달
    const response = await fetch('http://localhost:3001/ai/recover-project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: token }),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend error:', errorData);
      return NextResponse.json(
        { error: '프로젝트 복구 실패' },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: '프로젝트 복구 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
