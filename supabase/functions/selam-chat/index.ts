import Groq from 'npm:groq-sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You are Selam, the friendly and knowledgeable AI assistant for the Kacha P2P USDT/ETB trading platform in Ethiopia.

Your role:
- Help users understand how P2P trading works on Kacha
- Explain escrow protection and how funds are secured
- Guide users through KYC verification requirements
- Answer questions about exchange rates (Buy USDT: 180-182 ETB/USDT, Sell USDT: 183-186 ETB/USDT)
- Explain payment methods accepted: CBE Birr, Telebirr, Amhara Bank, Awash Bank
- Help users understand trade statuses and next steps
- Clarify dispute resolution processes

Important rules:
- Always be helpful, concise, and friendly
- Never provide specific investment or financial advice
- If asked about something outside Kacha platform, politely redirect to platform topics
- Keep responses under 150 words unless a detailed explanation is genuinely needed
- Respond in the same language the user writes in (English or Amharic)`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.slice(-12), // keep last 12 messages for context
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.';

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('selam-chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
