import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mail, Sparkles, Zap, Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inbox AI — Draft workplace emails in seconds" },
      { name: "description", content: "An AI workplace assistant that drafts professional emails for outreach, follow-ups, replies, and tough conversations." },
      { property: "og:title", content: "Inbox AI — Draft workplace emails in seconds" },
      { property: "og:description", content: "Draft polished workplace emails with an AI assistant tuned for tone, clarity, and intent." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/chat" });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Mail className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">Inbox AI</span>
        </div>
        <Link to="/auth">
          <Button variant="ghost" size="sm">Sign in</Button>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs text-muted-foreground mb-6">
          <Sparkles className="w-3 h-3 text-primary" />
          AI-powered workplace assistant
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 bg-gradient-primary bg-clip-text text-transparent">
          Draft any email.<br />In seconds.
        </h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
          Describe what you need to say — Inbox writes a polished, professional email
          with the right tone, structure, and intent.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/auth">
            <Button variant="hero" size="lg">Start drafting free</Button>
          </Link>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-24 text-left">
          <Feature icon={<Zap className="w-5 h-5" />} title="Instant drafts" desc="From a brief sentence to a complete email — subject line, body, and sign-off." />
          <Feature icon={<Sparkles className="w-5 h-5" />} title="Right tone, always" desc="Friendly, formal, firm, or apologetic — adapted to your situation." />
          <Feature icon={<Shield className="w-5 h-5" />} title="Responsible by default" desc="Refuses deceptive or harmful messages, and never invents facts." />
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-5 rounded-xl border border-border bg-card">
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
