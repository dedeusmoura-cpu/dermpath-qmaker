import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Votações clínicas",
  description: "Questões interativas para aulas de medicina.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
