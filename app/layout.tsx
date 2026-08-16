import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DermPath QMaker",
  description: "Questões clínicas interativas do ecossistema DermPath Navigator.",
  icons: {
    icon: "/dermpath-qmaker-logo.svg",
    shortcut: "/dermpath-qmaker-logo.svg",
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
