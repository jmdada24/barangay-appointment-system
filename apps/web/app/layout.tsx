import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import FloatingChatbot from '@/components/chatbot/FloatingChatbot'

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: {
    default: "Barangay Bayabas Appointment System",
    template: "%s | Barangay Bayabas",
  },
  description:
    "Official online service portal for Barangay Bayabas, Matina, Davao City. Book appointments, request documents, view announcements, and submit feedback.",
  
  applicationName: "Barangay Bayabas Appointment System",
  
  keywords: [
    "Barangay Bayabas",
    "Appointment System",
    "Barangay Clearance",
    "Certificate of Residency",
    "Certificate of Indigency",
    "Good Moral",
    "Cohabitation",
    "Business Permit",
    "Blotter Report",
    "Cedula",
    "Matina",
    "Davao City",
  ],
  openGraph: {
    title: "Barangay Bayabas Appointment System",
    description:
      "Book barangay services, view announcements, and manage appointments online.",
    type: "website",
  },
  
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
 return (
    <html lang="en" className={manrope.variable} suppressHydrationWarning>
      
      <body 
        className="font-sans antialiased" 
        suppressHydrationWarning
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
      >

        {children}
        <FloatingChatbot />

        <Toaster position="top-right" />
      </body>
    </html>
  );
}
