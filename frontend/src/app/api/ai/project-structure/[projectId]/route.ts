import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const token = request.headers.get('authorization');

    // Fastify 백엔드로 요청 전달
    const response = await fetch(
      `http://localhost:3001/api/ai/project-structure/${projectId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: token }),
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend error:', errorData);
      return NextResponse.json(
        { error: '프로젝트 구조 가져오기 실패' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: '프로젝트 구조 가져오기 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
