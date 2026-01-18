import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memories - Trip Photo Album",
  description: "Capture and organize your travel memories",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}
