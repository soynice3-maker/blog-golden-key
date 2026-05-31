import type { Metadata } from "next";
import "./globals.css";
import { SessionGuard } from "@/components/SessionGuard";

export const metadata: Metadata = {
  title: "키라이즈",
  description: "블로그 상위노출 최적화 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <SessionGuard />
        {children}
      </body>
    </html>
  );
}
