import React from 'react'
import * as Sentry from '@sentry/react'
import ErrorBoundaryFallback from './ErrorBoundaryFallback'
import throttle from 'lodash.throttle'

const MIN_TIME_BETWEEN_DIALOGS = 5 * 60 * 1000 // 5 minutes

let showDialog = throttle(() => {
  Sentry.showReportDialog()
}, MIN_TIME_BETWEEN_DIALOGS)

export default function ErrorBoundarySentry({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Sentry.ErrorBoundary
      showDialog={false}
      onError={(_err) => {
        showDialog()
      }}
      fallback={({ resetError }) => (
        <ErrorBoundaryFallback resetError={resetError} />
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  )
}
