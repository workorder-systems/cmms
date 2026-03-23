import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Work Order Systems",
  description: "Sign in and manage app access to your account",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="oauth-body">
        <a href="#oauth-main" className="oauth-skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
