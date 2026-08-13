import { useState } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '~/utils/cn'

interface AvatarProps extends ComponentPropsWithoutRef<'img'> {
  name: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
}

export function Avatar({ name, size = 'md', className, src, alt, ...props }: AvatarProps) {
  const [error, setError] = useState(false)
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  const showFallback = !src || error

  return (
    <span
      className={cn(
        'relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-blue-100 font-semibold text-brand-blue-800',
        sizes[size],
        className,
      )}
    >
      {showFallback ? (
        initials
      ) : (
        <img
          src={src}
          alt={alt ?? name}
          onError={() => {
            setError(true)
          }}
          className="size-full object-cover"
          {...props}
        />
      )}
    </span>
  )
}
