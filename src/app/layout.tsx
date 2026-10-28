import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Barangay Financial Management System by ODC",
  description: "Budget, spending, collections, and financial reports for barangays.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
