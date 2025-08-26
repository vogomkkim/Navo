'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the main content to avoid SSR issues
const HomeContent = dynamic(() => import('@/components/HomeContent'), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
