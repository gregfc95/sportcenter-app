import { CheckCircle2, ReceiptText } from "lucide-react";

export default function AccountStatusCard({ status = "Al día", paid = true }) {
  return (
    <section>
      <div className="relative overflow-hidden bg-surface rounded-xl p-md border border-outline-variant shadow-md shadow-black/5 flex items-center justify-between">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-accent/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col gap-xs">
          <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">
            Estado de cuenta
          </span>
          <div className="flex items-center gap-xs">
            <span className="text-headline-md text-on-surface">{status}</span>
            {paid && (
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#4CAF50]/10 border border-[#4CAF50]/30 ml-xs">
                <CheckCircle2 className="size-4 text-[#4CAF50]" />
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          aria-label="Ver historial de pagos"
          className="relative bg-surface-container border border-outline-variant p-sm rounded-lg text-accent hover:bg-surface-container-high transition-colors"
        >
          <ReceiptText className="size-5" />
        </button>
      </div>
    </section>
  );
}
