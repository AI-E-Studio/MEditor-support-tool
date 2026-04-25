import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
} from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const INPUT_BASE =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-slate-400 transition-colors hover:border-slate-300 focus:outline-none focus:border-[#2651A6] focus:ring-2 focus:ring-[#52B5F2]/30 disabled:bg-slate-50 disabled:text-slate-400 aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-200";

export function FormLabel({
  className,
  children,
  required,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cx(
        "block text-xs font-semibold text-[#0F172A] mb-1.5",
        className
      )}
      {...rest}
    >
      {children}
      {required && <span className="text-red-600 ml-0.5">*</span>}
    </label>
  );
}

export function FormHint({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <p className={cx("text-xs text-slate-500 mt-1", className)}>{children}</p>
  );
}

export function FormError({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className={cx("text-xs text-red-600 mt-1 font-medium", className)}
    >
      {children}
    </p>
  );
}

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(INPUT_BASE, className)} {...rest} />;
}

export function Textarea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(INPUT_BASE, "min-h-[88px] resize-y", className)}
      {...rest}
    />
  );
}

export function FormField({
  label,
  required,
  hint,
  error,
  htmlFor,
  children,
}: {
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      {label && (
        <FormLabel htmlFor={htmlFor} required={required}>
          {label}
        </FormLabel>
      )}
      {children}
      {error ? <FormError>{error}</FormError> : hint ? <FormHint>{hint}</FormHint> : null}
    </div>
  );
}
