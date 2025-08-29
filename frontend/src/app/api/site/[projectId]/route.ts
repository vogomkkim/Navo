import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;

    // Fastify 백엔드로 요청 전달
    const response = await fetch(`http://localhost:3001/site/${projectId}`, {
      method: "GET",
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Backend error:", errorData);
      return NextResponse.json(
        { error: "사이트 렌더링 실패" },
        { status: response.status }
      );
    }

    const html = await response.text();
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "사이트 렌더링 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
