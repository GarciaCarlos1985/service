import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '~/utils/cn'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'brand-gradient text-white shadow hover:opacity-95 focus-visible:ring-brand-blue-500',
  secondary:
    'bg-brand-green-200 text-brand-green-900 hover:bg-brand-green-300 focus-visible:ring-brand-green-500',
  outline:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-brand-blue-500',
  ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-brand-blue-500',
  destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
}

interface ButtonBaseProps {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  disabled?: boolean
}

type ButtonProps = ButtonBaseProps &
  (
    | ({ href?: undefined } & ComponentPropsWithoutRef<'button'>)
    | ({ href: string } & ComponentPropsWithoutRef<'a'>)
  )

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className,
  )

  const content: ReactNode = loading ? (
    <span
      aria-hidden
      className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  ) : (
    children
  )

  if (props.href !== undefined) {
    const { href, ...anchorProps } = props
    return (
      <a
        href={href}
        className={classes}
        aria-disabled={disabled || loading ? true : undefined}
        {...anchorProps}
      >
        {content}
      </a>
    )
  }

  const { type = 'button', ...buttonProps } = props
  return (
    <button type={type} className={classes} disabled={disabled || loading} {...buttonProps}>
      {content}
    </button>
  )
}
