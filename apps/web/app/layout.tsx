import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

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
    <html lang="en" className={manrope.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
