'use client';

interface Component {
  id: string;
  type: string;
  props: Record<string, any>;
}

interface DynamicComponentRendererProps {
  component: Component;
}

export function DynamicComponentRenderer({ component }: DynamicComponentRendererProps) {
  const { type, props } = component;

  // 기본 컴포넌트 타입들에 대한 렌더링
  switch (type) {
    case 'text':
      return (
        <div className="dynamic-text" {...props}>
          {props.content || '텍스트 컴포넌트'}
        </div>
      );

    case 'button':
      return (
        <button className="dynamic-button" {...props}>
          {props.text || '버튼'}
        </button>
      );

    case 'image':
      return (
        <img
          className="dynamic-image"
          src={props.src || '/placeholder-image.jpg'}
          alt={props.alt || '이미지'}
          {...props}
        />
      );

    case 'container':
      return (
        <div className="dynamic-container" {...props}>
          {props.children || '컨테이너'}
        </div>
      );

    case 'heading':
      const level = props.level || 1;
      if (level === 1) return <h1 className="dynamic-heading" {...props}>{props.text || '제목'}</h1>;
      if (level === 2) return <h2 className="dynamic-heading" {...props}>{props.text || '제목'}</h2>;
      if (level === 3) return <h3 className="dynamic-heading" {...props}>{props.text || '제목'}</h3>;
      if (level === 4) return <h4 className="dynamic-heading" {...props}>{props.text || '제목'}</h4>;
      if (level === 5) return <h5 className="dynamic-heading" {...props}>{props.text || '제목'}</h5>;
      if (level === 6) return <h6 className="dynamic-heading" {...props}>{props.text || '제목'}</h6>;
      return <h1 className="dynamic-heading" {...props}>{props.text || '제목'}</h1>;

    case 'paragraph':
      return (
        <p className="dynamic-paragraph" {...props}>
          {props.text || '문단'}
        </p>
      );

    default:
      return (
        <div className="dynamic-unknown" {...props}>
          알 수 없는 컴포넌트: {type}
        </div>
      );
  }
}
