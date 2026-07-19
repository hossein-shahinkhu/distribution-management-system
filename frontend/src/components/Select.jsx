import { useId } from 'react';

export default function Select({
  label,
  error,
  hint,
  className = '',
  wrapperClassName = '',
  children,
  ...props
}) {
  const id = useId();

  return (
    <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-ink/70">
          {label}
          {props.required && <span className="mr-1 text-danger">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          className={`
            w-full appearance-none rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink
            transition-colors duration-150
            focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-400/20
            disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted
            ${error
              ? 'border-danger focus:border-danger focus:ring-danger/20'
              : 'border-border hover:border-navy-200'
            }
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
        {/* Custom chevron */}
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-danger">
          <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
