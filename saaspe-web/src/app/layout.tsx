import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorTrackingProvider } from "@/providers/error-tracking-provider";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SaasPE - Agency Automation Platform",
  description: "Automate your agency's sales process with AI-powered proposals and email campaigns",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GoogleAnalytics />
        <ErrorBoundary>
          <ErrorTrackingProvider>
            <QueryProvider>
              {children}
            </QueryProvider>
          </ErrorTrackingProvider>
        </ErrorBoundary>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
