import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@/lib/supabase/server';
import type { Post } from '@/lib/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FALLBACK_MESSAGE =
  "I'm not sure — there isn't enough information in existing posts to answer this. Try browsing the relevant Hub or posting your question.";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // 1. Verify session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        model: 'text-embedding-3-small',
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

    // 4. Call match_posts via Supabase RPC
    const { data: posts, error: rpcError } = await supabase.rpc('match_posts', {
      query_embedding: embedding,
      similarity_threshold: 0.75,
      match_count: 5,
    });

    if (rpcError) {
      console.error('match_posts RPC error:', rpcError);
      return NextResponse.json({ error: 'Failed to search posts' }, { status: 500 });
    }

    const matchedPosts: Post[] = posts ?? [];

    // 5. Fallback if fewer than 2 posts returned
    if (matchedPosts.length < 2) {
      return NextResponse.json({ answer: FALLBACK_MESSAGE, sources: [] });
    }

    // 6. Call gpt-4o-mini with the summarization prompt
    const formattedPosts = matchedPosts
      .map((p) => `Title: ${p.title}\nBody: ${p.body}`)
      .join('\n\n---\n\n');

    const systemPrompt = `You are a helpful assistant for Cal Poly students. Answer the student's question using ONLY the posts provided below. For each claim, cite the source post using [Post: {title}] inline. If the provided posts do not contain enough information, say so explicitly.

Posts:
${formattedPosts}

Student question: ${question.trim()}`;

    let answer: string;
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: systemPrompt }],
      });
      answer = completion.choices[0]?.message?.content ?? FALLBACK_MESSAGE;
    } catch (err) {
      console.error('OpenAI chat error:', err);
      return NextResponse.json(
        { error: 'AI assistant is temporarily unavailable' },
        { status: 503 }
      );
    }

    // 7. Return answer and sources
    return NextResponse.json({ answer, sources: matchedPosts });
  } catch (err) {
    console.error('Unexpected error in POST /api/ai/ask:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
