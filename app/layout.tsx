import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import PWAInstaller from "@/components/PWAInstaller";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "New Mood - CRM and Project Management",
  description: "CRM and Project Management application built with Next.js, DaisyUI, and Neon Database",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "New Mood",
  },
  applicationName: "New Mood",
  themeColor: "#1a2332",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="abyss" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'abyss';
                document.documentElement.setAttribute('data-theme', theme);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${outfit.variable} antialiased font-sans`}
      >
        <PWAInstaller />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
