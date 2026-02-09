'use client';

// Re-export NuqsAdapter from a single source to ensure same module instance
// This fixes monorepo issues where different packages might load different nuqs instances
export { NuqsAdapter } from 'nuqs/adapters/next/app';
