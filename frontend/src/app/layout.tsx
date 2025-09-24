import "./globals.css";
import { AppWrapper } from "@/components/AppWrapper";
import { SettingsModal } from "@/components/settings/SettingsModal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Navo - AI-Powered Website Builder",
  description: "Build beautiful websites with AI assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppWrapper>
          <>
            {children}
            <SettingsModal />
          </>
        </AppWrapper>
      </body>
    </html>
  );
}
