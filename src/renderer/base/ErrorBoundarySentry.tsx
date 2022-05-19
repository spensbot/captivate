import React from 'react'
import * as Sentry from '@sentry/react'
import ErrorBoundaryFallback from './ErrorBoundaryFallback'

export default function ErrorBoundarySentry({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Sentry.ErrorBoundary
      showDialog={true}
      fallback={({ resetError }) => (
        <ErrorBoundaryFallback resetError={resetError} />
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  )
}
