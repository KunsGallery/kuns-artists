import path from "node:path";

/** @type {import("next").NextConfig} */
const fallbackR2PublicHost = "pub-f27a2486be62439cab911f2f6a1f4024.r2.dev";
const configuredR2PublicBaseUrl =
  process.env.NEXT_PUBLIC_R2_PUBLIC_HOST ||
  process.env.R2_PUBLIC_BASE_URL ||
  `https://${fallbackR2PublicHost}`;

let r2PublicHostname = fallbackR2PublicHost;

try {
  r2PublicHostname = new URL(
    configuredR2PublicBaseUrl.startsWith("http")
      ? configuredR2PublicBaseUrl
      : `https://${configuredR2PublicBaseUrl}`
  ).hostname;
} catch {
  r2PublicHostname = fallbackR2PublicHost;
}

const nextConfig = {
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: r2PublicHostname,
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
