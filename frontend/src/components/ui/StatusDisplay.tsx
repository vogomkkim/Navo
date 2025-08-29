"use client";

import { useState, useEffect } from "react";

interface StatusDisplayProps {
  initialStatus?: string;
}

export function StatusDisplay({
  initialStatus = "대기중",
}: StatusDisplayProps) {
  const [status, setStatus] = useState(initialStatus);

  // This effect is just for demonstration. In a real app, status would be updated via props or context.
  useEffect(() => {
    // Example: Simulate status updates
    // const timer = setTimeout(() => setStatus('Working...'), 2000);
    // return () => clearTimeout(timer);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm font-medium">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      {status}
    </div>
  );
}
