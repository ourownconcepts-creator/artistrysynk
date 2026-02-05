import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// GA4 Measurement ID - replace with your actual ID
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';
const PLAUSIBLE_DOMAIN = 'artistrysynk.com';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
    plausible: (...args: any[]) => void;
  }
}

export const initializeAnalytics = () => {
  // Initialize Google Analytics 4
  if (GA_MEASUREMENT_ID) {
    const gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(gaScript);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false, // We'll handle page views manually
    });
  }

  // Initialize Plausible Analytics (privacy-friendly)
  const plausibleScript = document.createElement('script');
  plausibleScript.defer = true;
  plausibleScript.dataset.domain = PLAUSIBLE_DOMAIN;
  plausibleScript.src = 'https://plausible.io/js/script.js';
  document.head.appendChild(plausibleScript);

  // Plausible fallback for custom events
  window.plausible = window.plausible || function() {
    (window.plausible as any).q = (window.plausible as any).q || [];
    (window.plausible as any).q.push(arguments);
  };
};

// Track page views
export const trackPageView = (path: string, title?: string) => {
  // GA4 page view
  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title || document.title,
    });
  }

  // Plausible automatically tracks page views
};

// Track custom events
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  // GA4 event
  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }

  // Plausible event
  if (window.plausible) {
    window.plausible(eventName, { props: eventParams });
  }
};

// React hook for automatic page view tracking
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);
};

// Analytics Provider Component
export const AnalyticsProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    initializeAnalytics();
  }, []);

  usePageTracking();

  return <>{children}</>;
};
