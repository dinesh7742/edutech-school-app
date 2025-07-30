import type { Metadata } from 'next';
// import { GeistSans } from 'geist/font/sans'; // Removed GeistSans
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from "@/components/ui/toaster";
import Script from 'next/script';

// const geistSans = GeistSans; // Removed GeistSans initialization

export const metadata: Metadata = {
  title: 'CampusConnect - PM SHRI MPS Varsha Nagar',
  description: 'School Management System for PM SHRI MPS Varsha Nagar, Vikhroli West, Mumbai 79',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}> {/* Removed geistSans.variable */}
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
        <Script src="https://www.google.com/recaptcha/api.js" async defer />
      </body>
    </html>
  );
}
