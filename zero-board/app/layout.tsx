import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Zero Board",
  description: "Self-hosted digital board for displaying events, weather, news and other widgets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="theme-dark">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
