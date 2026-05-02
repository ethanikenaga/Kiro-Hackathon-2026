/**
 * Generic embedding generation — decoupled from any specific document schema.
 *
 * Usage:
 *   import { createEmbeddingGenerator } from '@/lib/ai/embeddings';
 *   const generateEmbedding = createEmbeddingGenerator();
 *   const vector = await generateEmbedding('some text to embed');
 */

import OpenAI from 'openai';

export interface EmbeddingGeneratorConfig {
  /** OpenAI API key (read from env if not provided). */
  openaiApiKey?: string;

  /** Embedding model to use. Defaults to 'text-embedding-3-small'. */
  model?: string;
}

/**
 * Creates a reusable embedding generator function.
 * The returned function takes a string and returns a vector (number[]).
 */
export function createEmbeddingGenerator(config: EmbeddingGeneratorConfig = {}) {
  const { openaiApiKey, model = 'text-embedding-3-small' } = config;
  const openai = new OpenAI({ apiKey: openaiApiKey ?? process.env.OPENAI_API_KEY });

  return async function generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model,
      input: text,
    });
    return response.data[0].embedding;
  };
}

/**
 * Helper to build an embedding input string from a document's fields.
 * Customize the format function to match your document schema.
 */
export function formatDocumentForEmbedding(
  fields: Record<string, unknown>,
  format?: (fields: Record<string, unknown>) => string
): string {
  if (format) {
    return format(fields);
  }
  // Default: concatenate all string values
  return Object.values(fields)
    .filter((v) => typeof v === 'string' && v.trim() !== '')
    .join('\n');
}
