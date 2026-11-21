import type { ReactNode } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Choice({
  label,
  selected,
  disabled = false,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn("choice-pill", selected && "choice-pill-selected")}
      onClick={onClick}
      aria-pressed={selected}
      disabled={disabled}
    >
      {selected && <Check size={13} />}
      {label}
    </button>
  );
}

export function Question({
  number,
  title,
  note,
  children,
}: {
  number: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="profile-question">
      <div className="question-heading">
        <span>{number}</span>
        <div>
          <h2>{title}</h2>
          {note && <p>{note}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function PageHeading({
  eyebrow,
  title,
  subtitle,
  back,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  back: () => void;
}) {
  return (
    <>
      <button className="page-back" onClick={back}>
        <ArrowLeft size={15} /> Back
      </button>
      <div className="page-heading">
        <p className="eyebrow accent-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </>
  );
}
