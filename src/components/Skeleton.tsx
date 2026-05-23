import React from 'react'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`bg-[#1A2E1A] animate-pulse rounded-lg ${className}`}
      {...props}
    />
  )
}
