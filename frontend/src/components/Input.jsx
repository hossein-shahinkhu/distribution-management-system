import { useId } from 'react';

export default function Input({
  label,
  error,
  hint,
  className = '',
  wrapperClassName = '',
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
      <input
        id={id}
        className={`
          w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink
          placeholder:text-muted/60
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
      />
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
