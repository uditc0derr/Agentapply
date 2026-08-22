import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agentapply",
  description:
    "Upload your resume, import recruiter emails, and send personalized job applications in bulk.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
