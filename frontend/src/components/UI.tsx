import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        {eyebrow && (
          <p className="text-xs font-mono uppercase tracking-wider text-vault-primary mb-1">{eyebrow}</p>
        )}
        <h2 className="text-xl font-semibold text-vault-ink">{title}</h2>
      </div>
      {action}
    </div>
  );
}

const statusStyles: Record<string, string> = {
  PENDING: "bg-vault-gold/15 text-vault-gold",
  CONFIRMED: "bg-vault-primaryLight text-vault-primary",
  REJECTED: "bg-vault-coralLight text-vault-coral",
  CANCELLED: "bg-vault-line text-vault-muted",
  COMPLETED: "bg-vault-primaryLight text-vault-primaryDark",
  NO_SHOW: "bg-vault-coralLight text-vault-coral",
  default: "bg-vault-line text-vault-muted",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${statusStyles[status] || statusStyles.default}`}>{status.replace("_", " ")}</span>;
}

export function EmptyState({ title, description, icon }: { title: string; description: string; icon?: ReactNode }) {
  return (
    <div className="text-center py-14 px-4">
      {icon && <div className="flex justify-center mb-3 text-vault-muted">{icon}</div>}
      <p className="font-medium text-vault-ink mb-1">{title}</p>
      <p className="text-sm text-vault-muted max-w-sm mx-auto">{description}</p>
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-spin rounded-full border-2 border-vault-primary/20 border-t-vault-primary ${className}`} />
  );
}

export function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-vault-bg">
      <Spinner className="w-8 h-8" />
    </div>
  );
}
