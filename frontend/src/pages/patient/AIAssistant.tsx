import { FormEvent, useEffect, useRef, useState } from "react";
import { Sparkles, Send, FileText, Pill, Activity, Info } from "lucide-react";
import { api } from "../../api/client";
import { Card, Spinner } from "../../components/UI";

type Tab = "assistant" | "explain" | "analyze" | "summary";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export default function AIAssistant() {
  const [tab, setTab] = useState<Tab>("assistant");

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "assistant", label: "Ask a question", icon: Sparkles },
    { key: "explain", label: "Explain a report", icon: FileText },
    { key: "analyze", label: "Analyze a prescription", icon: Pill },
    { key: "summary", label: "Health summary", icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-vault-primary mb-1">Assistive · Clinical AI Engine</p>
          <h1 className="text-2xl font-display font-semibold">Health Valut AI Assistant</h1>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-vault-primaryLight text-vault-primary self-start sm:self-auto border border-vault-primary/20">
          <span className="w-2 h-2 rounded-full bg-vault-primary animate-pulse" />
          AI Intelligence Active
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t.key ? "bg-vault-primary text-white" : "bg-white border border-vault-line text-vault-muted hover:bg-vault-primaryLight"
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "assistant" && <AssistantChat />}
      {tab === "explain" && <TextTool endpoint="/ai/explain-report" fieldName="reportText" resultKey="explanation" placeholder="Paste the text of your medical report here..." cta="Explain this report" />}
      {tab === "analyze" && <TextTool endpoint="/ai/analyze-prescription" fieldName="prescriptionText" resultKey="analysis" placeholder="Paste the text of your prescription here..." cta="Analyze prescription" />}
      {tab === "summary" && <HealthSummary />}
    </div>
  );
}

function AssistantChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg: ChatMsg = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);
    try {
      const res = await api.post("/ai/assistant", { message: userMsg.content, conversationId });
      setConversationId(res.data.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: res.data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Something went wrong reaching the assistant. Please try again." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="flex flex-col h-[60vh]">
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <Sparkles className="w-8 h-8 text-vault-primary mx-auto mb-2" />
            <p className="text-sm text-vault-muted max-w-sm mx-auto">
              Ask general health questions, get basic first-aid guidance, or ask when to seek professional care. This assistant does not diagnose or replace a doctor.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
              m.role === "user" ? "bg-vault-primary text-white" : "bg-vault-bg text-vault-ink"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-vault-bg rounded-2xl px-4 py-2.5"><Spinner className="w-4 h-4" /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t border-vault-line mt-4">
        <input className="input flex-1" placeholder="e.g. I have a mild fever, what should I do?" value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" disabled={sending} className="btn-primary px-3.5"><Send className="w-4 h-4" /></button>
      </form>
    </Card>
  );
}

function TextTool({ endpoint, fieldName, resultKey, placeholder, cta }: { endpoint: string; fieldName: string; resultKey: string; placeholder: string; cta: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setResult("");
    try {
      const res = await api.post(endpoint, { [fieldName]: text });
      setResult(res.data[resultKey]);
    } catch {
      setResult("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea className="input" rows={12} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Working..." : cta}</button>
        </form>
      </Card>
      <Card>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner className="w-6 h-6" /></div>
        ) : result ? (
          <p className="text-sm whitespace-pre-wrap">{result}</p>
        ) : (
          <p className="text-sm text-vault-muted">The result will appear here.</p>
        )}
      </Card>
    </div>
  );
}

function HealthSummary() {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await api.get("/ai/health-summary");
      setSummary(res.data.summary);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      {!loaded ? (
        <div className="text-center py-10">
          <Activity className="w-8 h-8 text-vault-primary mx-auto mb-2" />
          <p className="text-sm text-vault-muted max-w-sm mx-auto mb-4">
            Generate an assistive summary from your profile, history, records, and prescriptions.
          </p>
          <button onClick={generate} disabled={loading} className="btn-primary">{loading ? "Generating..." : "Generate summary"}</button>
        </div>
      ) : (
        <div>
          <p className="text-sm whitespace-pre-wrap">{summary}</p>
          <button onClick={generate} disabled={loading} className="btn-ghost text-sm mt-4">{loading ? "Regenerating..." : "Regenerate"}</button>
        </div>
      )}
    </Card>
  );
}
