'use client';

import { useGlobalErrorLogger } from '@/hooks/useGlobalErrorLogger';

interface ClientWrapperProps {
  children: React.ReactNode;
}

export function ClientWrapper({ children }: ClientWrapperProps) {
  useGlobalErrorLogger(); // This hook will only run on the client side

  return <>{children}</>;
}
