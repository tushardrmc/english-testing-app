import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EnglishTestPro",
  description: "English testing and practice",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
