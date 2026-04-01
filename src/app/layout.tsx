import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "bury.lol — A final resting place for things the internet loved and lost",
  description: "Buy a grave. Write a eulogy. Let it go.",
  openGraph: {
    title: "bury.lol",
    description: "A final resting place for things the internet loved and lost.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "bury.lol",
    description: "A final resting place for things the internet loved and lost.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-cream antialiased">
        {children}
      </body>
    </html>
  );
}
