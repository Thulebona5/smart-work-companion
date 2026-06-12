import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are Inbox, an AI workplace assistant specialized in EMAIL GENERATION.

Your job is to help the user draft professional, clear, and well-toned emails for any workplace situation: outreach, follow-ups, replies, requests, status updates, sensitive messages, announcements, and more.

How to respond:
- If the user gives a brief, draft a complete email immediately. Include a Subject line, greeting, body, and sign-off.
- If essential details are missing (recipient, goal, tone), ask 1-2 short clarifying questions before drafting — never more.
- Default tone: professional, warm, concise. Adapt to requested tone (formal, friendly, firm, apologetic, persuasive, etc.).
- Keep emails skimmable: short paragraphs, bullets for lists, no filler.
- Offer 2-3 variants when the user asks for options or when tone is ambiguous.
- Format every email in markdown using a fenced block labeled "Subject:" then the body, so it's easy to copy.
- Refuse to write deceptive, harassing, discriminatory, or otherwise unethical messages, and briefly explain why.
- Never invent facts about real people or companies. If a detail is unknown, use a clear placeholder like [Name] or [Date].

Be a sharp, trustworthy drafting partner — not a chatbot that hedges.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice(7);

        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const userId = userData.user.id;

        const { messages } = (await request.json()) as { messages: UIMessage[] };
        if (!Array.isArray(messages)) return new Response("Bad Request", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        // Persist the most recent user message
        const last = messages[messages.length - 1];
        if (last?.role === "user") {
          const text = last.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("")
            .trim();
          if (text) {
            await supabase.from("messages").insert({ user_id: userId, role: "user", content: text });
          }
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
          onFinish: async ({ text }) => {
            if (text?.trim()) {
              await supabase
                .from("messages")
                .insert({ user_id: userId, role: "assistant", content: text });
            }
          },
        });

        return result.toUIMessageStreamResponse();
      },
    },
  },
});
