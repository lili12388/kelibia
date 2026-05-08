import { useEffect } from "react";
import { useLocation } from "wouter";

// Track page views for analytics
export function usePageView() {
  const [location] = useLocation();

  useEffect(() => {
    // Send page view to server
    const trackPageView = async () => {
      try {
        const response = await fetch('/api/analytics/pageview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            pageUrl: location,
            referrer: document.referrer,
          }),
        });
        
        if (!response.ok) {
          return;
        }
        
        await response.json();
      } catch (error) {
        // Silently fail - analytics should never break the app
      }
    };

    trackPageView();
  }, [location]); // Track whenever location changes
}

// Send heartbeat to track active users
export function useActiveUserHeartbeat() {
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        await fetch('/api/analytics/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
      } catch (error) {
        // Silently fail
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 3 seconds
    const interval = setInterval(sendHeartbeat, 3000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, []);
}
