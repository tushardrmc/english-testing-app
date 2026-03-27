import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduCare English Test",
  description: "EduCare English Test for grammar and spoken English practice.",
  icons: {
    icon: "/educare-logo.png",
    apple: "/educare-logo.png",
  },
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
