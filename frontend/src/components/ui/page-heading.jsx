import { cn } from "@/lib/utils";

export function PageHeading({ children, className, ...props }) {
  return (
    <div className={cn("flex items-center gap-sm", className)} {...props}>
      <span
        aria-hidden="true"
        className="w-1.5 h-7 rounded-full bg-accent shadow-[0_0_10px_rgba(255,183,0,0.5)]"
      />
      <h2 className="text-headline-lg text-on-surface">{children}</h2>
    </div>
  );
}
