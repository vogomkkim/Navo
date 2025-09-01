'use client';

import { usePageLayout } from '@/lib/api';
import { LayoutRenderer } from './LayoutRenderer';
import { LayoutProvider } from '@/app/context/LayoutContext';

interface PagePreviewProps {
  pageId: string;
  className?: string;
}

export function PagePreview({ pageId, className = '' }: PagePreviewProps) {
  const { data, isLoading, isError, error } = usePageLayout(pageId);

  if (isLoading) {
    return (
      <div className={`page-preview-loading ${className}`}>
        <div className="preview-spinner">🔄</div>
        <h3>페이지 로딩 중...</h3>
        <p>데이터베이스에서 레이아웃 정보를 가져오는 중입니다.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`page-preview-error ${className}`}>
        <div className="error-icon">❌</div>
        <h3>페이지를 불러올 수 없습니다</h3>
        <p>
          <strong>오류:</strong> {error?.message || '알 수 없는 오류'}
        </p>
        <p>
          <strong>페이지 ID:</strong> {pageId}
        </p>
        <details>
          <summary>디버그 정보</summary>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </details>
      </div>
    );
  }

  if (!data?.layout) {
    return (
      <div className={`page-preview-empty ${className}`}>
        <div className="empty-icon">📄</div>
        <h3>페이지 데이터가 없습니다</h3>
        <p>선택한 페이지에 레이아웃 정보가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={`page-preview ${className}`}>
      <div className="preview-header">
        <div className="preview-info">
          <span className="preview-icon">👁️</span>
          <span className="preview-title">페이지 프리뷰</span>
          <span className="preview-id">ID: {pageId}</span>
        </div>
        <div className="component-count">
          컴포넌트: {data.layout.components?.length || 0}개
        </div>
      </div>

      <div className="preview-content">
        <LayoutProvider>
          <LayoutRenderer layout={data.layout} />
        </LayoutProvider>
      </div>

      <div className="preview-footer">
        <div className="layout-summary">
          <details>
            <summary>레이아웃 구조 보기</summary>
            <pre className="layout-json">
              {JSON.stringify(data.layout, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
