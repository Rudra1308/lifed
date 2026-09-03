import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { GridBackground } from "@/components/GridBackground";

export const metadata: Metadata = {
  title: "Lifed — Personal AI Command Center",
  description: "A lightweight, personal-first AI command center with warped gravity grid visual language, goals, tasks, memory, and intelligent planning.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {/* Interactive Warped Grid / Gravity Well Background */}
          <GridBackground />

          {/* Main content layer */}
          <div className="relative z-10">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}