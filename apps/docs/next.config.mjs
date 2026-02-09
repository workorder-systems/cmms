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

/** @type {import('next').NextConfig} */
const nextConfig = {
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
