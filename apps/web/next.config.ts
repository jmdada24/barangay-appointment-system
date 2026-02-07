import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
   experimental: {
    serverActions: {
      bodySizeLimit: "6mb", // Allow up to 6MB for file uploads (5MB file + form data)
    },
  },
};

export default nextConfig;
