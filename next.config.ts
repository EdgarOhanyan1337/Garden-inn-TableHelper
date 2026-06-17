/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Match the GitHub repository name exactly
  basePath: '/Garden-inn-TableHelper',
  // Required for static image optimization with export
  images: {
    unoptimized: true,
  },
  // Trailing slash for GitHub Pages compatibility
  trailingSlash: true,
}

export default nextConfig
