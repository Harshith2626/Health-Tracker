import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Sparkles,
  X,
  Send,
  Maximize2,
  Minimize2,
  Minus,
  RotateCcw,
  Copy,
  Check,
  FileText,
  Pill,
  Activity,
  Bot,
  User as UserIcon,
  Info,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Spinner } from "./UI";

type Tab = "chat" | "explain" | "analyze" | "summary";

interface ChatMsg {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

const QUICK_PROMPTS = [
  "What questions should I ask my doctor?",
  "First-aid steps for a minor cut or burn",
  "How can I improve my BMI and health habits?",
  "What is the normal blood pressure range?",
];

export default function FloatingAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [demoMode, setDemoMode] = useState<boolean | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check demo mode status once
  useEffect(() => {
    api
      .get("/ai/status")
      .then((res) => setDemoMode(res.data.demoMode))
      .catch(() => {});
  }, []);

  // Listen for global custom event to open AI Chat from any page
  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab?: Tab; maximized?: boolean; prompt?: string }>;
      setIsOpen(true);
      if (customEvent.detail?.tab) setActiveTab(customEvent.detail.tab);
      if (customEvent.detail?.maximized !== undefined) setIsMaximized(customEvent.detail.maximized);
      if (customEvent.detail?.prompt) {
        setInput(customEvent.detail.prompt);
      }
    };
    window.addEventListener("open-ai-chat", handleOpen);
    return () => window.removeEventListener("open-ai-chat", handleOpen);
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen && activeTab === "chat") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, activeTab, sending]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && activeTab === "chat") {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, activeTab]);

  async function handleSendMessage(promptText?: string) {
    const textToSend = (promptText || input).trim();
    if (!textToSend || sending) return;

    const userMsg: ChatMsg = {
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await api.post("/ai/assistant", {
        message: textToSend,
        conversationId,
      });
      setConversationId(res.data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.reply,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I encountered an error reaching the assistant service. Please check your connection and try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    handleSendMessage();
  }

  function handleResetChat() {
    setMessages([]);
    setConversationId(undefined);
    setInput("");
  }

  function handleCopy(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  // 1. Minimized / Floating Action Button
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-vault-primary text-white shadow-xl hover:bg-vault-primaryDark hover:scale-105 active:scale-95 transition-all duration-200"
          title="Open AI Health Assistant"
          aria-label="Open AI Health Assistant"
        >
          {/* Subtle glowing ring animation */}
          <span className="absolute -inset-1 rounded-full bg-vault-primary/30 animate-ping opacity-60 pointer-events-none" />
          <Sparkles className="w-6 h-6 animate-pulse" />
          
          {/* Tooltip badge */}
          <span className="absolute right-16 bg-vault-ink/90 text-white text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
            Ask AI Assistant
          </span>
        </button>
      </div>
    );
  }

  // Window container styles
  const windowClass = isMaximized
    ? "fixed inset-4 sm:inset-8 md:inset-10 lg:inset-12 z-50 rounded-2xl bg-vault-surface border border-vault-line shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    : "fixed bottom-5 right-5 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-5rem)] rounded-2xl bg-vault-surface border border-vault-line shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200";

  return (
    <>
      {/* Backdrop when maximized for clean focus */}
      {isMaximized && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMaximized(false)}
        />
      )}

      <div className={windowClass}>
        {/* Window Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-vault-line bg-vault-primaryLight/40 backdrop-blur-md select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-vault-primary flex items-center justify-center text-white shrink-0 shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-vault-ink truncate">Health Valut AI</h3>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-vault-primary/10 text-vault-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-vault-primary animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-[11px] text-vault-muted truncate">Assistive Medical Insights & First-Aid</p>
            </div>
          </div>

          {/* Window Action Controls */}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {activeTab === "chat" && messages.length > 0 && (
              <button
                onClick={handleResetChat}
                className="p-1.5 text-vault-muted hover:text-vault-ink hover:bg-white/60 rounded-lg transition-colors"
                title="New conversation / Clear chat"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* Minimize to FAB */}
            <button
              onClick={() => {
                setIsMaximized(false);
                setIsOpen(false);
              }}
              className="p-1.5 text-vault-muted hover:text-vault-ink hover:bg-white/60 rounded-lg transition-colors"
              title="Minimize to floating bubble"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* Maximize / Restore Toggle */}
            <button
              onClick={() => setIsMaximized((prev) => !prev)}
              className="p-1.5 text-vault-muted hover:text-vault-ink hover:bg-white/60 rounded-lg transition-colors"
              title={isMaximized ? "Restore window size" : "Maximize window"}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={() => {
                setIsMaximized(false);
                setIsOpen(false);
              }}
              className="p-1.5 text-vault-muted hover:text-vault-coral hover:bg-vault-coralLight/50 rounded-lg transition-colors"
              title="Close window"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-1 px-3 py-1.5 bg-vault-bg border-b border-vault-line overflow-x-auto no-scrollbar">
          <TabButton
            active={activeTab === "chat"}
            onClick={() => setActiveTab("chat")}
            icon={Sparkles}
            label="Ask AI"
          />
          <TabButton
            active={activeTab === "explain"}
            onClick={() => setActiveTab("explain")}
            icon={FileText}
            label="Explain Report"
          />
          <TabButton
            active={activeTab === "analyze"}
            onClick={() => setActiveTab("analyze")}
            icon={Pill}
            label="Prescription"
          />
          <TabButton
            active={activeTab === "summary"}
            onClick={() => setActiveTab("summary")}
            icon={Activity}
            label="Health Summary"
          />
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
          {activeTab === "chat" && (
            <ChatView
              messages={messages}
              input={input}
              setInput={setInput}
              sending={sending}
              bottomRef={bottomRef}
              inputRef={inputRef}
              handleSubmit={handleSubmit}
              handleSendMessage={handleSendMessage}
              handleCopy={handleCopy}
              copiedIndex={copiedIndex}
              isMaximized={isMaximized}
            />
          )}

          {activeTab === "explain" && (
            <ToolView
              title="Medical Report Explainer"
              description="Paste lab reports, test values, or radiology findings to receive an easy-to-understand plain English summary."
              endpoint="/ai/explain-report"
              fieldName="reportText"
              resultKey="explanation"
              placeholder="e.g. Lipid Profile Test Results: Total Cholesterol: 240 mg/dL, Triglycerides: 180 mg/dL, HDL: 38 mg/dL, LDL: 160 mg/dL..."
              ctaText="Explain Medical Report"
              isMaximized={isMaximized}
            />
          )}

          {activeTab === "analyze" && (
            <ToolView
              title="Digital Prescription Analyzer"
              description="Paste prescription text or medicine names to understand standard usages, precautions, and instructions."
              endpoint="/ai/analyze-prescription"
              fieldName="prescriptionText"
              resultKey="analysis"
              placeholder="e.g. Rx: Amoxicillin 500mg 1 tab TID for 5 days after food. Paracetamol 650mg SOS for fever..."
              ctaText="Analyze Prescription"
              isMaximized={isMaximized}
            />
          )}

          {activeTab === "summary" && (
            <SummaryView isMaximized={isMaximized} />
          )}
        </div>

        {/* Window Footer Disclaimer */}
        <div className="px-3 py-1.5 bg-vault-bg/80 border-t border-vault-line flex items-center justify-between text-[11px] text-vault-muted">
          <span className="flex items-center gap-1 truncate">
            <Info className="w-3 h-3 text-vault-primary shrink-0" />
            Assistive only · Not medical advice
          </span>
          <Link
            to="/patient/ai-assistant"
            onClick={() => setIsOpen(false)}
            className="hover:text-vault-primary flex items-center gap-1 font-medium transition-colors shrink-0 ml-2"
          >
            Full screen page <ExternalLink className="w-2.5 h-2.5" />
          </Link>
        </div>
      </div>
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
        active
          ? "bg-vault-primary text-white shadow-xs"
          : "text-vault-muted hover:text-vault-ink hover:bg-white"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}

function ChatView({
  messages,
  input,
  setInput,
  sending,
  bottomRef,
  inputRef,
  handleSubmit,
  handleSendMessage,
  handleCopy,
  copiedIndex,
  isMaximized,
}: {
  messages: ChatMsg[];
  input: string;
  setInput: (v: string) => void;
  sending: boolean;
  bottomRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLInputElement>;
  handleSubmit: (e: FormEvent) => void;
  handleSendMessage: (prompt?: string) => void;
  handleCopy: (text: string, index: number) => void;
  copiedIndex: number | null;
  isMaximized: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Scrollable messages container */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isMaximized ? "max-w-4xl mx-auto w-full" : ""}`}>
        {messages.length === 0 ? (
          <div className="py-6 flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-vault-primaryLight flex items-center justify-center text-vault-primary">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="max-w-xs">
              <h4 className="text-sm font-semibold text-vault-ink">How can I assist you today?</h4>
              <p className="text-xs text-vault-muted mt-1 leading-relaxed">
                Ask general health queries, first-aid measures, or guidance on when to seek doctor care.
              </p>
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="w-full space-y-1.5 pt-2">
              <p className="text-[11px] font-mono uppercase text-vault-muted tracking-wider text-left px-1">
                Suggested questions:
              </p>
              <div className="grid gap-1.5">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="flex items-center justify-between text-left p-2.5 rounded-xl border border-vault-line bg-vault-surface hover:border-vault-primary hover:bg-vault-primaryLight/30 text-xs text-vault-ink transition-all group"
                  >
                    <span>{prompt}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-vault-muted group-hover:text-vault-primary transition-colors shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-vault-primaryLight flex items-center justify-center text-vault-primary shrink-0 mt-0.5 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`group relative rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "max-w-[85%] bg-vault-primary text-white rounded-br-sm shadow-sm"
                    : "max-w-[88%] bg-vault-bg text-vault-ink border border-vault-line/60 rounded-bl-sm"
                }`}
              >
                {m.content}

                {/* Copy button for AI replies */}
                {m.role === "assistant" && (
                  <button
                    onClick={() => handleCopy(m.content, i)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-white border border-vault-line text-vault-muted hover:text-vault-ink transition-all shadow-xs"
                    title="Copy message"
                  >
                    {copiedIndex === i ? (
                      <Check className="w-3 h-3 text-vault-primary" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>

              {m.role === "user" && (
                <div className="w-7 h-7 rounded-lg bg-vault-ink text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Spinner */}
        {sending && (
          <div className="flex items-start gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-lg bg-vault-primaryLight flex items-center justify-center text-vault-primary shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-vault-bg border border-vault-line/60 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              <Spinner className="w-3.5 h-3.5" />
              <span className="text-xs text-vault-muted">Thinking & retrieving health guidance...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-vault-line bg-vault-surface">
        <form
          onSubmit={handleSubmit}
          className={`flex items-center gap-2 ${isMaximized ? "max-w-4xl mx-auto w-full" : ""}`}
        >
          <input
            ref={inputRef}
            className="input text-xs sm:text-sm flex-1 py-2.5 bg-vault-bg focus:bg-white transition-colors"
            placeholder="Ask a health question (e.g., 'What are signs of dehydration?')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="btn-primary px-3.5 py-2.5 shrink-0 flex items-center justify-center shadow-sm disabled:opacity-40"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function ToolView({
  title,
  description,
  endpoint,
  fieldName,
  resultKey,
  placeholder,
  ctaText,
  isMaximized,
}: {
  title: string;
  description: string;
  endpoint: string;
  fieldName: string;
  resultKey: string;
  placeholder: string;
  ctaText: string;
  isMaximized: boolean;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || loading) return;
    setLoading(true);
    setResult("");
    try {
      const res = await api.post(endpoint, { [fieldName]: text });
      setResult(res.data[resultKey]);
    } catch {
      setResult("Unable to process the request right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`flex-1 overflow-y-auto p-4 flex flex-col ${isMaximized ? "max-w-4xl mx-auto w-full" : ""}`}>
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-vault-ink">{title}</h4>
        <p className="text-xs text-vault-muted mt-0.5">{description}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 flex flex-col flex-1">
        <textarea
          className="input text-xs sm:text-sm flex-1 min-h-[100px] resize-none"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="btn-primary py-2 text-xs sm:text-sm flex-1 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Spinner className="w-4 h-4" /> Analyzing with AI...
              </>
            ) : (
              ctaText
            )}
          </button>
          {result && (
            <button
              type="button"
              onClick={() => {
                setText("");
                setResult("");
              }}
              className="btn-secondary py-2 text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {result && (
        <div className="mt-4 p-3.5 rounded-xl bg-vault-bg border border-vault-line space-y-1.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-vault-primary flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> AI Analysis:
            </span>
          </div>
          <p className="text-xs sm:text-sm text-vault-ink whitespace-pre-wrap leading-relaxed">
            {result}
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryView({ isMaximized }: { isMaximized: boolean }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await api.get("/ai/health-summary");
      setSummary(res.data.summary);
      setLoaded(true);
    } catch {
      setSummary("Failed to generate health summary. Please ensure you are logged in.");
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`flex-1 overflow-y-auto p-4 flex flex-col justify-center items-center text-center ${isMaximized ? "max-w-4xl mx-auto w-full" : ""}`}>
      {!loaded ? (
        <div className="py-8 space-y-4 max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-vault-primaryLight flex items-center justify-center text-vault-primary mx-auto">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-vault-ink">Patient Health Summary</h4>
            <p className="text-xs text-vault-muted mt-1 leading-relaxed">
              Consolidate your profile vitals, medical history, lab records, and digital prescriptions into an instant executive summary.
            </p>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="btn-primary w-full py-2.5 text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Spinner className="w-4 h-4" /> Generating Summary...
              </>
            ) : (
              "Generate AI Health Summary"
            )}
          </button>
        </div>
      ) : (
        <div className="w-full text-left space-y-3 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-vault-primary flex items-center gap-1.5">
              <Activity className="w-4 h-4" /> Your AI Health Summary
            </span>
            <button
              onClick={generate}
              disabled={loading}
              className="text-xs text-vault-muted hover:text-vault-primary flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Refresh
            </button>
          </div>
          <div className="flex-1 p-3.5 rounded-xl bg-vault-bg border border-vault-line overflow-y-auto">
            <p className="text-xs sm:text-sm text-vault-ink whitespace-pre-wrap leading-relaxed">
              {summary}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
