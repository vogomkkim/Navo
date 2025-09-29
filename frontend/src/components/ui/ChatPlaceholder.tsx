"use client";

interface ChatPlaceholderProps {
  onExampleClick: (message: string) => void;
}

export function ChatPlaceholder({ onExampleClick }: ChatPlaceholderProps) {
  const examples = [
    "전자상거래 웹사이트 만들어줘",
    "블로그 플랫폼 만들어줘",
    "경매 사이트 만들어줘",
  ];

  return (
    <div className="chat-placeholder">
      <div className="placeholder-icon">💬</div>
      <h3>AI와 대화를 시작해보세요</h3>
      <p>어떤 프로젝트를 만들고 싶으신가요?</p>
      <div className="placeholder-examples">
        {examples.map((example, index) => (
          <button
            key={`example-${example.slice(0, 10)}-${index}`}
            className="example-button"
            onClick={() => onExampleClick(example)}
          >
            • {example.replace("만들어줘", "")}
          </button>
        ))}
      </div>
    </div>
  );
}
