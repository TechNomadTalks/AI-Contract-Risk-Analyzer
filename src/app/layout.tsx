import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Contract Sentinel - AI Contract Risk Analyzer",
  description: "AI-powered contract analysis tool that extracts text, identifies risky clauses, and provides risk summaries",
  keywords: ["contract", "legal", "risk analysis", "AI", "OCR", "document analysis"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased noise-overlay">
        {children}
      </body>
    </html>
  );
}
