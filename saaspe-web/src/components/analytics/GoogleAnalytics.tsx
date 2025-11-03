'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import { Suspense, useEffect } from 'react'

function AnalyticsTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const GA_MEASUREMENT_ID = 'G-YQ3487YF0T'

  useEffect(() => {
    if (pathname) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')

      // Track page view on route change
      if (typeof window !== 'undefined' && (window as any).gtag) {
        ;(window as any).gtag('config', GA_MEASUREMENT_ID, {
          page_path: url,
        })
      }
    }
  }, [pathname, searchParams])

  return null
}

export default function GoogleAnalytics() {
  const GA_MEASUREMENT_ID = 'G-YQ3487YF0T'

  // Only load in production
  if (process.env.NODE_ENV !== 'production') {
    return null
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>
    </>
  )
}
