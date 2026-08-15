import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // vinext/Next.js treat any POST with a multipart/form-data body as a
    // possible progressive Server Action submission and cap it at the
    // Server Actions body size limit (1 MB default) before it ever reaches
    // our route handler — including plain uploads like
    // app/api/uploads/route.ts. Raise it to cover the 8 MB images allowed
    // by that route's own validation.
    serverActions: {
      bodySizeLimit: "9mb",
    },
  },
};

export default nextConfig;
