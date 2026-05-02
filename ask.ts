/**
 * Generic AI ask handler — RAG pipeline decoupled from any specific data source or auth.
 *
 * Usage:
 *   import { createAskHandler } from '@/lib/ai/ask';
 *   export const POST = createAskHandler({ retrieveDocuments, ... });
 */

import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import type { AIHelperConfig, AIDocument, AIAskResponse } from './types';

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant. Answer the user's question using ONLY the documents provided below. For each claim, cite the source using [Source: {title}] inline. If the provided documents do not contain enough information, say so explicitly.

Documents:
{{documents}}

Question: {{question}}`;

const DEFAULT_FALLBACK =
  "I don't have enough information to answer that. Try browsing the site or asking a more specific question.";

/**
 * Creates a Next.js Route Handler (POST) for the AI ask endpoint.
 * All app-specific logic is injected via the config object.
 */
export function createAskHandler(config: AIHelperConfig) {
  const {
    openaiApiKey,
    embeddingModel = 'text-embedding-3-small',
    chatModel = 'gpt-4o-mini',
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    fallbackMessage = DEFAULT_FALLBACK,
    minDocuments = 2,
    maxDocuments = 5,
    similarityThreshold = 0.75,
    retrieveDocuments,
    authenticate,
  } = config;

  const openai = new OpenAI({ apiKey: openaiApiKey ?? process.env.OPENAI_API_KEY });

  return async function POST(request: NextRequest) {
    try {
      // 1. Authentication (if configured)
      if (authenticate) {
        const authError = await authenticate(request);
        if (authError) {
          return NextResponse.json({ error: authError }, { status: 401 });
        }
      }

      // 2. Parse request body
      let body: Record<string, unknown>;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }

      const { question } = body;
      if (!question || typeof question !== 'string' || question.trim() === '') {
        return NextResponse.json({ error: 'question is required' }, { status: 400 });
      }

      // 3. Embed the question
      let embedding: number[];
      try {
        const embeddingResponse = await openai.embeddings.create({
          model: embeddingModel,
          input: question.trim(),
        });
        embedding = embeddingResponse.data[0].embedding;
      } catch (err) {
        console.error('OpenAI embedding error:', err);
        return NextResponse.json(
          { error: 'AI assistant is temporarily unavailable' },
          { status: 503 }
        );
      }

      // 4. Retrieve relevant documents via the injected function
      let documents: AIDocument[];
      try {
        documents = await retrieveDocuments(embedding, {
          similarityThreshold,
          maxDocuments,
        });
      } catch (err) {
        console.error('Document retrieval error:', err);
        return NextResponse.json({ error: 'Failed to search documents' }, { status: 500 });
      }

      // 5. Fallback if not enough documents
      if (documents.length < minDocuments) {
        return NextResponse.json({ answer: fallbackMessage, sources: [] } satisfies AIAskResponse);
      }

      // 6. Build the prompt and call the chat model
      const formattedDocs = documents
        .map((d) => `Title: ${d.title}\nBody: ${d.body}`)
        .join('\n\n---\n\n');

      const finalPrompt = systemPrompt
        .replace('{{documents}}', formattedDocs)
        .replace('{{question}}', question.trim());

      let answer: string;
      try {
        const completion = await openai.chat.completions.create({
          model: chatModel,
          messages: [{ role: 'user', content: finalPrompt }],
        });
        answer = completion.choices[0]?.message?.content ?? fallbackMessage;
      } catch (err) {
        console.error('OpenAI chat error:', err);
        return NextResponse.json(
          { error: 'AI assistant is temporarily unavailable' },
          { status: 503 }
        );
      }

      // 7. Return answer and sources
      return NextResponse.json({ answer, sources: documents } satisfies AIAskResponse);
    } catch (err) {
      console.error('Unexpected error in AI ask handler:', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
