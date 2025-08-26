import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
