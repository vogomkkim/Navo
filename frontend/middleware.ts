import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /api 경로는 허용 (백엔드로 프록시)
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 루트 경로 (/)는 허용 (메인 페이지)
  if (pathname === '/') {
    return NextResponse.next();
  }

  // 로그인 페이지는 허용 (Next.js 라우트)
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // .html 확장자 파일 접근 차단
  if (pathname.endsWith('.html')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // 그 외 모든 경로는 404 처리
  return new NextResponse('Not Found', { status: 404 });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
