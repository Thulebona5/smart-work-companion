import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { loadMessages, clearMessages } from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, Send, Sparkles, Trash2, LogOut, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Inbox AI — Draft emails with AI" },
      { name: "description", content: "Draft polished workplace emails with an AI assistant tuned for tone, clarity, and intent." },
    ],
  }),
  component: ChatPage,
});

const SUGGESTIONS = [
  { title: "Follow up on a proposal", prompt: "Write a polite follow-up email checking in on a proposal I sent last Tuesday to a prospective client at Acme Corp." },
  { title: "Decline a meeting", prompt: "Help me politely decline a meeting invite for Friday at 3pm — I'm in deep-focus work but want to leave the door open." },
  { title: "Ask for a raise", prompt: "Draft a confident but respectful email to my manager requesting a meeting to discuss a salary review." },
  { title: "Apologize for a delay", prompt: "Write a warm apology email to a client for a one-week delay on a deliverable, with a clear new timeline." },
];

function ChatPage() {
  const navigate = useNavigate();
  const load = useServerFn(loadMessages);
  const clear = useServerFn(clearMessages);
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load()
      .then((rows) => {
        const ui: UIMessage[] = rows.map((r) => ({
          id: r.id,
          role: r.role as "user" | "assistant",
          parts: [{ type: "text", text: r.content }],
        }));
        setInitial(ui);
      })
      .catch(() => setInitial([]));
  }, [load]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (url, init) => {
          const { data } = await supabase.auth.getSession();
          const headers = new Headers(init?.headers);
          if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
          return fetch(url, { ...init, headers });
        },
      }),
    [],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    messages: initial ?? [],
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (initial && messages.length === 0 && initial.length > 0) {
      setMessages(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const isLoading = status === "submitted" || status === "streaming";

  const submit = async (text: string) => {
    const value = text.trim();
    if (!value || isLoading) return;
    setInput("");
    await sendMessage({ text: value });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const handleClear = async () => {
    await clear();
    setMessages([]);
    toast.success("Conversation cleared");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Mail className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight">Inbox AI</h1>
              <p className="text-xs text-muted-foreground leading-tight">Email drafting assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClear} title="Clear conversation">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut} title="Sign out">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {initial === null ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <EmptyState onPick={submit} />
          ) : (
            <div className="space-y-6">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {status === "submitted" && (
                <div className="flex gap-3 items-start">
                  <Avatar role="assistant" />
                  <div className="flex gap-1 pt-3">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "120ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "240ms" }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-card/50 backdrop-blur">
        <form
          className="max-w-3xl mx-auto px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
        >
          <div className="relative">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              placeholder="Describe the email you need… (Shift+Enter for newline)"
              className="min-h-[60px] max-h-[200px] resize-none pr-14 text-base"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              variant="hero"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 bottom-2 h-9 w-9"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            AI-generated drafts may need review. Always check recipients, facts, and tone before sending.
          </p>
        </form>
      </div>
    </div>
  );
}

function Avatar({ role }: { role: "user" | "assistant" | "system" }) {
  if (role === "user") {
    return (
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground shrink-0">
        You
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
      <Sparkles className="w-4 h-4 text-primary-foreground" />
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
  const isUser = message.role === "user";
  return (
    <div className="flex gap-3 items-start">
      <Avatar role={message.role} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-muted-foreground mb-1">
          {isUser ? "You" : "Inbox AI"}
        </div>
        <div
          className={
            isUser
              ? "rounded-2xl rounded-tl-sm bg-secondary text-secondary-foreground px-4 py-3 whitespace-pre-wrap text-sm leading-relaxed"
              : "rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3 prose prose-sm max-w-none prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-pre:bg-muted prose-pre:text-foreground prose-code:text-foreground"
          }
        >
          {isUser ? text : <ReactMarkdown>{text}</ReactMarkdown>}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="text-center py-12 animate-in fade-in duration-500">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 shadow-elegant">
        <Mail className="w-7 h-7 text-primary-foreground" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">What email shall we draft?</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Describe the recipient, goal, and tone — I'll write a polished email you can copy and send.
      </p>
      <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.title}
            onClick={() => onPick(s.prompt)}
            className="text-left p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-elegant transition-all group"
          >
            <div className="text-sm font-medium mb-1 group-hover:text-primary transition-colors">
              {s.title}
            </div>
            <div className="text-xs text-muted-foreground line-clamp-2">{s.prompt}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
