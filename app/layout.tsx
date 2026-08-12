import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DermPath Quiz",
  description: "Questões clínicas interativas do ecossistema DermPath Navigator.",
  icons: {
    icon: "/dermpath-quiz-logo.png",
    shortcut: "/dermpath-quiz-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
