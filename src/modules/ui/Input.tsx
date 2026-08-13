import { forwardRef, useId } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '~/utils/cn'

export interface InputProps extends ComponentPropsWithoutRef<'input'> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, ...props },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = error ? `${inputId}-error` : undefined
  const hintId = hint ? `${inputId}-hint` : undefined

  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cn(
          'h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400',
          'focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/30',
          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/30',
          className,
        )}
        {...props}
      />
      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
})
