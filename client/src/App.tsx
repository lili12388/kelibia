import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrokerAuthGuard } from "@/components/broker-auth-guard";
import { useActiveUserHeartbeat, usePageView } from "@/hooks/use-analytics";
import ScrollToTop from "@/components/scroll-to-top";
import { lazy, Suspense } from "react";
import BrowsePropertiesPage from "@/pages/browse-properties";
import NotFound from "@/pages/not-found";

// Lazy load secondary routes to reduce initial bundle size
const ListPropertyPage = lazy(() => import("@/pages/list-property"));
const PropertyDetailPage = lazy(() => import("@/pages/property-detail"));
const BrokerLoginPage = lazy(() => import("@/pages/broker-login"));
const BrokerDashboardPage = lazy(() => import("@/pages/broker-dashboard"));
const BrokerBrowsePage = lazy(() => import("@/pages/broker-browse"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin-analytics"));
const AboutPage = lazy(() => import("@/pages/about"));

function Router() {
  // Send heartbeat to track active users
  useActiveUserHeartbeat();
  
  // Track page views for analytics
  usePageView();
  
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
        <Switch>
          <Route path="/" component={BrowsePropertiesPage} />
          <Route path="/browse-properties" component={BrowsePropertiesPage} />
          <Route path="/about" component={AboutPage} />
          <Route path="/property/:id" component={PropertyDetailPage} />
          <Route path="/maisons/:id" component={PropertyDetailPage} />
          <Route path="/broker/login" component={BrokerLoginPage} />
          <Route path="/broker/dashboard">
            <BrokerAuthGuard>
              <BrokerDashboardPage />
            </BrokerAuthGuard>
          </Route>
          <Route path="/broker/browse">
            <BrokerAuthGuard>
              <BrokerBrowsePage />
            </BrokerAuthGuard>
          </Route>
          {/* Admin routes - same as broker routes but with /admin prefix */}
          <Route path="/admin/list-property">
            <BrokerAuthGuard>
              <ListPropertyPage />
            </BrokerAuthGuard>
          </Route>
          <Route path="/admin/browse">
            <BrokerAuthGuard>
              <BrokerBrowsePage />
            </BrokerAuthGuard>
          </Route>
          <Route path="/admin/analytics">
            <BrokerAuthGuard>
              <AdminAnalyticsPage />
            </BrokerAuthGuard>
          </Route>
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
