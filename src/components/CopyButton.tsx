import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  size?: "sm" | "xs";
}

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  className = "",
  size = "xs",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const sizeClasses =
    size === "sm"
      ? "px-3.5 py-1.5 text-xs gap-1.5"
      : "px-2.5 py-1 text-xs gap-1.5";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center justify-center rounded-lg border border-zinc-200/90 dark:border-white/12 bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-200 hover:border-[#FF006E]/60 hover:bg-[#FF006E]/10 hover:text-zinc-900 dark:hover:text-white transition-all font-medium whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF006E] ${sizeClasses} ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{copiedLabel}</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
