import type { APIRoute } from 'astro';
import OpenAI from 'openai';

export const prerender = false;

const SYSTEM_PROMPTS: Record<string, string> = {
  article: `You are a structural editor for a literary personal website. Extract structure from the author's writing.
RULES:
- Do NOT rewrite, paraphrase, or improve any sentence in the body. Copy sentences verbatim.
- Generate a title if none is obvious.
- lede: 1-2 sentence summary using the author's words where possible.
- pull_quote: lift the single strongest sentence verbatim from the text.
- tags: 3-6 lowercase topic keywords.
Return JSON only: { "title": string, "lede": string, "body": string, "pull_quote": string, "tags": string[] }`,

  poem: `You are a poetry editor. Your only job is to extract structure — never change the poem.
RULES:
- body must be identical to the input text. Do not change a single word, line break, or punctuation mark.
- title: extract from the poem if present, otherwise generate a short fitting title.
- tags: 3-5 thematic keywords, lowercase.
Return JSON only: { "title": string, "body": string, "tags": string[], "year": null }`,

  project: `You are a structural editor for a portfolio website with a literary newspaper aesthetic.
RULES:
- Do NOT rewrite body sentences. Preserve the author's exact words and voice.
- headline: punchy, under 12 words, plain language.
- lede: 1-2 sentence summary using the author's words.
- pull_quote: lift the single strongest sentence verbatim from the text.
- label: pick ONE of: NONPROFIT, RESEARCH, ENGINEERING, COMMUNITY, WRITING.
- tags: 3-6 lowercase topic keywords.
Return JSON only: { "headline": string, "lede": string, "body": string, "pull_quote": string, "label": string, "tags": string[] }`,

  commonplace: `You are a Digital Librarian and Curator.`,
};

const TYPE_TEMPERATURES: Record<string, number> = {
  article: 0.2,
  poem: 0.2,
  project: 0.2,
  commonplace: 0.3,
};

const COMMONPLACE_USER_PROMPT = (rawText: string) => `Parse the following raw text into a structured commonplace entry.

RAW TEXT:
${rawText}

Return ONLY valid JSON:
{
  "quote": "verbatim quotation only, no surrounding quotes",
  "source_author": "full name or empty string",
  "source_work": "book/article/source title or empty string",
  "annotation": "user's personal reflection separated from the quote, or empty string",
  "tags": ["3-5 semantic/conceptual tags, not keyword matches"]
}`;

export const POST: APIRoute = async ({ request }) => {
  let body: { type?: string; rawText?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { type, rawText } = body;

  if (!type || !SYSTEM_PROMPTS[type]) {
    return new Response(JSON.stringify({ error: 'type must be article, poem, project, or commonplace' }), { status: 400 });
  }
  if (!rawText?.trim()) {
    return new Response(JSON.stringify({ error: 'rawText is required' }), { status: 400 });
  }

  const apiKey = import.meta.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), { status: 500 });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const userContent = type === 'commonplace' ? COMMONPLACE_USER_PROMPT(rawText) : rawText;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS[type] },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: TYPE_TEMPERATURES[type] ?? 0.2,
    });

    const result = JSON.parse(completion.choices[0].message.content ?? '{}');
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? 'AI processing failed' }), { status: 500 });
  }
};
