import { forwardRef, useId } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '~/utils/cn'

export interface SelectProps extends ComponentPropsWithoutRef<'select'> {
  label?: string
  error?: string
  hint?: string
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, className, id, placeholder, children, ...props },
  ref,
) {
  const autoId = useId()
  const selectId = id ?? autoId
  const errorId = error ? `${selectId}-error` : undefined
  const hintId = hint ? `${selectId}-hint` : undefined

  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cn(
          'h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900',
          'focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/30',
          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/30',
          className,
        )}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {children}
      </select>
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
