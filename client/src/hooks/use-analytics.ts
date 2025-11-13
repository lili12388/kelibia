import { useEffect } from "react";
import { useLocation } from "wouter";

// Track page views for analytics
export function usePageView() {
  const [location] = useLocation();

  useEffect(() => {
    // Send page view to server
    const trackPageView = async () => {
      try {
        console.log('🔵 CLIENT: Tracking page view for:', location);
        console.log('🔵 CLIENT: Current URL:', window.location.href);
        console.log('🔵 CLIENT: Referrer:', document.referrer);
        
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
        
        console.log('📡 CLIENT: Response status:', response.status);
        console.log('📡 CLIENT: Response ok:', response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ CLIENT: Server error:', response.status, errorText);
          return;
        }
        
        const result = await response.json();
        console.log('✅ CLIENT: Tracking successful:', result);
      } catch (error) {
        console.error('❌ CLIENT: Analytics tracking failed:', error);
        console.error('❌ CLIENT: Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace'
        });
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
        console.log('💓 CLIENT: Sending heartbeat...');
        await fetch('/api/analytics/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        console.log('✅ CLIENT: Heartbeat sent');
      } catch (error) {
        // Silently fail
        console.error('❌ CLIENT: Heartbeat failed:', error);
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
