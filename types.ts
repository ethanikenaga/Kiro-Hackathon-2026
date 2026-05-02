/**
 * Generic AI helper types — not tied to any specific app.
 */

/** A document that can be searched and cited by the AI assistant. */
export interface AIDocument {
  id: string;
  title: string;
  body: string;
  category?: string | null;
  metadata?: Record<string, unknown>;
  url?: string;
  created_at?: string;
  similarity?: number;
}

/** Configuration for the AI assistant's RAG pipeline. */
export interface AIHelperConfig {
  /** OpenAI API key (read from env if not provided). */
  openaiApiKey?: string;

  /** Embedding model to use. Defaults to 'text-embedding-3-small'. */
  embeddingModel?: string;

  /** Chat model to use. Defaults to 'gpt-4o-mini'. */
  chatModel?: string;

  /** System prompt template. Use {{documents}} and {{question}} as placeholders. */
  systemPrompt?: string;

  /** Message returned when not enough context is found. */
  fallbackMessage?: string;

  /** Minimum number of documents required to generate an answer (default: 2). */
  minDocuments?: number;

  /** Maximum number of documents to retrieve (default: 5). */
  maxDocuments?: number;

  /** Similarity threshold for document retrieval (default: 0.75). */
  similarityThreshold?: number;

  /**
   * Function that retrieves relevant documents given an embedding vector.
   * This is the main integration point — implement this for your data source.
   */
  retrieveDocuments: (
    embedding: number[],
    options: { similarityThreshold: number; maxDocuments: number }
  ) => Promise<AIDocument[]>;

  /**
   * Optional function to verify the request is authenticated.
   * Return null/undefined if valid, or an error message string if not.
   */
  authenticate?: (request: Request) => Promise<string | null | undefined>;
}

/** The response shape from the AI ask endpoint. */
export interface AIAskResponse {
  answer: string;
  sources: AIDocument[];
}

/** Configuration for the category suggestion feature. */
export interface AICategorySuggestConfig {
  /** OpenAI API key (read from env if not provided). */
  openaiApiKey?: string;

  /** Chat model to use. Defaults to 'gpt-4o-mini'. */
  chatModel?: string;

  /** The prompt template. Use {{title}} and {{body}} as placeholders. */
  prompt?: string;

  /** Minimum combined character length of title + body to trigger suggestion (default: 10). */
  minLength?: number;

  /** Valid hub values for validation. If provided, the response is validated against these. */
  validHubs?: string[];

  /** Valid category values for validation. */
  validCategories?: string[];

  /**
   * Optional function to verify the request is authenticated.
   * Return null/undefined if valid, or an error message string if not.
   */
  authenticate?: (request: Request) => Promise<string | null | undefined>;
}

/** The response shape from the category suggestion endpoint. */
export interface AICategorySuggestResponse {
  hub: string;
  category: string;
}
