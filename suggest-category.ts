/**
 * Generic AI category suggestion handler — decoupled from any specific app schema.
 *
 * Usage:
 *   import { createSuggestCategoryHandler } from '@/lib/ai/suggest-category';
 *   export const POST = createSuggestCategoryHandler({ validHubs: [...], ... });
 */

import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import type { AICategorySuggestConfig, AICategorySuggestResponse } from './types';

const DEFAULT_PROMPT = `Given this draft post title and body, suggest the most appropriate hub and category.
Return JSON only: { "hub": "...", "category": "..." }

Title: {{title}}
Body: {{body}}`;

/**
 * Creates a Next.js Route Handler (POST) for the AI category suggestion endpoint.
 * All app-specific logic (valid hubs, categories, prompt) is injected via config.
 */
export function createSuggestCategoryHandler(config: AICategorySuggestConfig) {
  const {
    openaiApiKey,
    chatModel = 'gpt-4o-mini',
    prompt = DEFAULT_PROMPT,
    minLength = 10,
    validHubs,
    validCategories,
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

      const { title, body: postBody } = body;

      if (typeof title !== 'string' || typeof postBody !== 'string') {
        return NextResponse.json(
          { error: 'title and body are required strings' },
          { status: 400 }
        );
      }

      // 3. Reject if combined length below threshold
      if (title.length + postBody.length < minLength) {
        return NextResponse.json(
          { error: `title and body combined must be at least ${minLength} characters` },
          { status: 400 }
        );
      }

      // 4. Build the prompt and call the chat model
      const finalPrompt = prompt
        .replace('{{title}}', title)
        .replace('{{body}}', postBody);

      let hub: string;
      let category: string;

      try {
        const completion = await openai.chat.completions.create({
          model: chatModel,
          messages: [{ role: 'user', content: finalPrompt }],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from OpenAI');
        }

        const parsed = JSON.parse(content) as { hub?: string; category?: string };
        hub = parsed.hub ?? '';
        category = parsed.category ?? '';
      } catch (err) {
        console.error('OpenAI suggest-category error:', err);
        return NextResponse.json(
          { error: 'AI assistant is temporarily unavailable' },
          { status: 500 }
        );
      }

      // 5. Validate against allowed values (if configured)
      if (validHubs && validHubs.length > 0 && !validHubs.includes(hub)) {
        hub = validHubs[0]; // fall back to first valid hub
      }
      if (validCategories && validCategories.length > 0 && !validCategories.includes(category)) {
        category = validCategories[0]; // fall back to first valid category
      }

      return NextResponse.json({ hub, category } satisfies AICategorySuggestResponse);
    } catch (err) {
      console.error('Unexpected error in suggest-category handler:', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
