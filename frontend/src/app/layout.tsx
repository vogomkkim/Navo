import './globals.css';
import './components/layout.css';

import type { Metadata } from 'next';

import { QueryClientWrapper } from '@/components/QueryClientWrapper';
import { ThemeProvider } from '@/components/ThemeProvider';

import { AuthProvider } from './context/AuthContext';
import { ComponentDefinitionProvider } from './context/ComponentDefinitionContext';
import { EventTrackerProvider } from './context/EventTrackerContext';
import { LayoutProvider } from './context/LayoutContext';

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
                <ThemeProvider>
                  <LayoutProvider>{children}</LayoutProvider>
                </ThemeProvider>
              </ComponentDefinitionProvider>
            </EventTrackerProvider>
          </AuthProvider>
        </QueryClientWrapper>
      </body>
    </html>
  );
}
