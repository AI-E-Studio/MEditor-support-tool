import type { HTMLAttributes, ReactNode } from "react";

type DivProps = HTMLAttributes<HTMLDivElement>;

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({ className, children, ...rest }: DivProps) {
  return (
    <div
      className={cx(
        "bg-white rounded-xl border border-slate-200 shadow-sm",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  title,
  description,
  action,
  ...rest
}: DivProps & {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={cx(
        "px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4 flex-wrap",
        className
      )}
      {...rest}
    >
      <div className="min-w-0">
        {title && (
          <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
        )}
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children, ...rest }: DivProps) {
  return (
    <div className={cx("px-6 py-5", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }: DivProps) {
  return (
    <div
      className={cx(
        "px-6 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
