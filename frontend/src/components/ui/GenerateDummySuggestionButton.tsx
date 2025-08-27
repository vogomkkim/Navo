"use client";

import { useGenerateDummySuggestion } from "@/lib/api";

interface GenerateDummySuggestionButtonProps {
  onGenerateSuccess?: (data: any) => void;
  onGenerateError?: (error: Error) => void;
}

export function GenerateDummySuggestionButton({
  onGenerateSuccess,
  onGenerateError,
}: GenerateDummySuggestionButtonProps) {
  const {
    mutate: generateSuggestion,
    isPending,
    isSuccess,
    isError,
    error,
  } = useGenerateDummySuggestion();

  const handleGenerateClick = () => {
    generateSuggestion(undefined, {
      // Pass undefined as the mutation function doesn't require a payload
      onSuccess: (data) => {
        console.log("Dummy suggestion generated successfully:", data);
        onGenerateSuccess?.(data);
      },
      onError: (err) => {
        console.error("Failed to generate dummy suggestion:", err);
        onGenerateError?.(err);
      },
    });
  };

  return (
    <button
      id="generateDummySuggestionBtn"
      onClick={handleGenerateClick}
      disabled={isPending}
    >
      {isPending ? "생성 중..." : "더미 제안 생성"}
    </button>
  );
}
