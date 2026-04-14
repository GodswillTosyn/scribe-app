import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are Scribe AI, a research assistant. Use the provided PDF context to answer questions accurately. Cite specific page numbers when referencing content. If the information is not present in the provided context, clearly state that you don't have enough information to answer rather than guessing or making up information. Be concise and well-structured in your responses. Use markdown formatting.`;

export async function POST(req: NextRequest) {
  try {
    const { prompt, context, chatHistory } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured. Add it to .env.local" },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    // Build messages array
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add chat history
    if (chatHistory) {
      for (const msg of chatHistory) {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.text,
        });
      }
    }

    // Add the current prompt with context
    const fullPrompt = context
      ? `--- PDF CONTEXT (Pages surrounding current view) ---\n${context}\n--- END CONTEXT ---\n\nUser request: ${prompt}`
      : prompt;

    messages.push({ role: "user", content: fullPrompt });

    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      stream: true,
      temperature: 0.3,
      max_tokens: 2048,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (streamErr) {
          const msg = streamErr instanceof Error ? streamErr.message : "Stream interrupted";
          controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error occurred";
    console.error("[Scribe AI Error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
