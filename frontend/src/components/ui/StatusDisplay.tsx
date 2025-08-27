'use client';

import { useState, useEffect } from 'react';

interface StatusDisplayProps {
  initialStatus?: string;
}

export function StatusDisplay({ initialStatus = 'Idle' }: StatusDisplayProps) {
  const [status, setStatus] = useState(initialStatus);

  // This effect is just for demonstration. In a real app, status would be updated via props or context.
  useEffect(() => {
    // Example: Simulate status updates
    // const timer = setTimeout(() => setStatus('Working...'), 2000);
    // return () => clearTimeout(timer);
  }, []);

  return (
    <div className="status" id="status">
      {status}
    </div>
  );
}
