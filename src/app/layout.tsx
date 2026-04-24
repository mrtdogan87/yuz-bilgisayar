import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "100 Bilgisayar = 100 Gelecek",
  description: "Bağışlanan her bilgisayar, bu duvarda bir hücreye dönüşür.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full">
      <body className={`${inter.className} min-h-full`}>{children}</body>
    </html>
  );
}
