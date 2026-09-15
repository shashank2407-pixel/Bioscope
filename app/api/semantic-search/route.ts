import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openaiKey) {
      // Fallback deterministic parsing if OpenAI key is missing
      const lower = query.toLowerCase();
      let habitat = '';
      let status = '';

      if (lower.includes('forest')) habitat = 'Forest';
      if (lower.includes('wetland') || lower.includes('swamp')) habitat = 'Wetland';
      if (lower.includes('himalaya') || lower.includes('mountain')) habitat = 'Himalayas';

      if (lower.includes('endangered')) status = 'EN';
      if (lower.includes('critically')) status = 'CR';
      if (lower.includes('vulnerable')) status = 'VU';

      return NextResponse.json({ habitat, status, region: '' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Extract the habitat (Forest, Wetland, Himalayas, Marine, Grassland), status (LC, VU, EN, CR), and region from the user query. Return ONLY a strict JSON object with keys: habitat, status, region. If a field is not mentioned, return empty string.',
          },
          { role: 'user', content: query },
        ],
        temperature: 0,
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());

    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json({ habitat: '', status: '', region: '' }, { status: 200 });
  }
}