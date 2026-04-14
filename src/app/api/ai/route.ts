import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are Scribe AI, a research assistant. Use the provided PDF context to answer questions accurately. Cite specific page numbers when referencing content. If the information is not present in the provided context, clearly state that you don't have enough information to answer rather than guessing or making up information. Be concise and well-structured in your responses. Use markdown formatting.`;

export async function POST(req: NextRequest) {
  try {
    const { prompt, context, chatHistory } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured. Add it to .env.local" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    // Build conversation history
    const history = (chatHistory || []).map(
      (msg: { role: string; text: string }) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      })
    );

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
        {
          role: "model",
          parts: [
            {
              text: "Understood. I am Scribe AI. I will only answer based on the provided PDF context and cite page numbers. I will not hallucinate or guess information not present in the context.",
            },
          ],
        },
        ...history,
      ],
    });

    const fullPrompt = context
      ? `--- PDF CONTEXT (Pages surrounding current view) ---\n${context}\n--- END CONTEXT ---\n\nUser request: ${prompt}`
      : prompt;

    const result = await chat.sendMessageStream(fullPrompt);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (streamErr) {
          const msg =
            streamErr instanceof Error
              ? streamErr.message
              : "Stream interrupted";
          controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";
    console.error("[Scribe AI Error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
