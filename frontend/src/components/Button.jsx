export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 select-none';

  const sizes = {
    sm:   'rounded-lg px-3 py-1.5 text-xs',
    md:   'rounded-xl px-4 py-2.5 text-sm',
    lg:   'rounded-xl px-5 py-3 text-base',
  };

  const variants = {
    primary: 'bg-navy-600 text-white hover:bg-navy-700 active:bg-navy-800 focus-visible:outline-navy-600 shadow-sm',
    amber:   'bg-amber-400 text-navy-900 hover:bg-amber-500 active:bg-amber-600 focus-visible:outline-amber-400 shadow-sm',
    ghost:   'bg-transparent text-navy-600 hover:bg-navy-50 active:bg-navy-100',
    danger:  'bg-danger text-white hover:bg-danger/90 active:bg-danger/80 focus-visible:outline-danger shadow-sm',
    outline: 'border border-border bg-white text-ink hover:bg-navy-50 active:bg-navy-100 shadow-sm',
    soft:    'bg-navy-50 text-navy-700 hover:bg-navy-100 active:bg-navy-200',
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
