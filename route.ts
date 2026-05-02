import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@/lib/supabase/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    const { title, body: postBody } = body;

    if (typeof title !== 'string' || typeof postBody !== 'string') {
      return NextResponse.json({ error: 'title and body are required strings' }, { status: 400 });
    }

    // 3. Reject if combined length < 10
    if (title.length + postBody.length < 10) {
      return NextResponse.json(
        { error: 'title and body combined must be at least 10 characters' },
        { status: 400 }
      );
    }

    // 4. Call gpt-4o-mini with the structured suggestion prompt
    const prompt = `Given this draft post title and body, suggest the most appropriate hub (rideshare | lost_found | questions | opportunities) and category (clubs | fraternities | classes | housing | campus_life | job | event | item_for_sale | other).
Return JSON only: { "hub": "...", "category": "..." }

Title: ${title}
Body: ${postBody}`;

    let hub: string;
    let category: string;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
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

    // 5. Return the suggestion
    return NextResponse.json({ hub, category });
  } catch (err) {
    console.error('Unexpected error in POST /api/ai/suggest-category:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
