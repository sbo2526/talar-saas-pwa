import type { HTMLAttributes, ReactNode } from "react";

export function AdminCard({
  children,
  className = "",
  ...props
}: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...props}
      className={`rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/92 p-4 shadow-[0_18px_60px_rgba(17,24,39,0.07)] backdrop-blur sm:rounded-[2rem] sm:p-5 ${className}`}
    >
      {children}
    </section>
  );
}
