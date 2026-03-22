import nextMDX from '@next/mdx'

import { recmaPlugins } from './src/mdx/recma.mjs'
import { rehypePlugins } from './src/mdx/rehype.mjs'
import { remarkPlugins } from './src/mdx/remark.mjs'
import withSearch from './src/mdx/search.mjs'

const withMDX = nextMDX({
  options: {
    remarkPlugins,
    rehypePlugins,
    recmaPlugins,
  },
})

/*
 * GitHub Pages (and similar static hosts under a subpath): set in CI only:
 *   NEXT_STATIC_EXPORT=true
 *   NEXT_PAGES_BASE_PATH=/<repo-name>   (e.g. /db for https://org.github.io/db/)
 */
const staticExport = process.env.NEXT_STATIC_EXPORT === 'true'
const pagesBasePath = (process.env.NEXT_PAGES_BASE_PATH || '').replace(/\/$/, '') || undefined

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(staticExport && {
    output: 'export',
    images: { unoptimized: true },
    ...(pagesBasePath ? { basePath: pagesBasePath, assetPrefix: pagesBasePath } : {}),
  }),
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'mdx'],
  outputFileTracingIncludes: {
    '/**/*': ['./src/app/**/*.mdx'],
  },
  async redirects() {
    return [
      { source: '/sdks', destination: '/installation', permanent: true },
      { source: '/contacts', destination: '/tenants', permanent: true },
      { source: '/conversations', destination: '/work-orders', permanent: true },
      { source: '/messages', destination: '/work-orders', permanent: true },
      { source: '/groups', destination: '/tenants', permanent: true },
      { source: '/attachments', destination: '/work-orders', permanent: true },
      { source: '/pagination', destination: '/quickstart', permanent: true },
      { source: '/webhooks', destination: '/', permanent: true },
    ]
  },
}

export default withSearch(withMDX(nextConfig))
