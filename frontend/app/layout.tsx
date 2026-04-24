import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tarsheeh.cv",
  description: "Intelligent Talent Acquisition",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}