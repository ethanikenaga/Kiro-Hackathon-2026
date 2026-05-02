/**
 * AI Helper module — a portable, configurable AI assistant for any Next.js site.
 *
 * This module provides:
 * - RAG-powered Q&A (ask handler)
 * - AI category suggestion (suggest-category handler)
 * - Embedding generation utilities
 *
 * All app-specific details (data source, auth, prompts, categories) are injected
 * via configuration objects, making this module reusable across different sites.
 *
 * Quick start:
 *
 *   // app/api/ai/ask/route.ts
 *   import { createAskHandler } from '@/lib/ai';
 *   export const POST = createAskHandler({
 *     retrieveDocuments: async (embedding, opts) => { ... },
 *     systemPrompt: 'You are a helpful assistant for ...',
 *   });
 *
 *   // app/api/ai/suggest-category/route.ts
 *   import { createSuggestCategoryHandler } from '@/lib/ai';
 *   export const POST = createSuggestCategoryHandler({
 *     validHubs: ['general', 'support'],
 *     validCategories: ['billing', 'technical', 'other'],
 *   });
 */

export { createAskHandler } from './ask';
export { createSuggestCategoryHandler } from './suggest-category';
export { createEmbeddingGenerator, formatDocumentForEmbedding } from './embeddings';
export type {
  AIDocument,
  AIHelperConfig,
  AIAskResponse,
  AICategorySuggestConfig,
  AICategorySuggestResponse,
} from './types';
