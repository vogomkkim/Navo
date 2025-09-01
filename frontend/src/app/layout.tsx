import type { Metadata } from 'next';
import './globals.css';
import './components/layout.css';
import { AuthProvider } from './context/AuthContext';
import { EventTrackerProvider } from './context/EventTrackerContext';
import { ComponentDefinitionProvider } from './context/ComponentDefinitionContext';
import { LayoutProvider } from './context/LayoutContext';
import { QueryClientWrapper } from '@/components/QueryClientWrapper';

export const metadata: Metadata = {
  title: 'Navo - AI-Powered Website Builder',
  description: 'Build beautiful websites with AI assistance',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <QueryClientWrapper>
          <AuthProvider>
            <EventTrackerProvider>
              <ComponentDefinitionProvider>
                <LayoutProvider>{children}</LayoutProvider>
              </ComponentDefinitionProvider>
            </EventTrackerProvider>
          </AuthProvider>
        </QueryClientWrapper>
      </body>
    </html>
  );
}
