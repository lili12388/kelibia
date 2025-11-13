import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrokerAuthGuard } from "@/components/broker-auth-guard";
import { useActiveUserHeartbeat, usePageView } from "@/hooks/use-analytics";
import ScrollToTop from "@/components/scroll-to-top";
import HomePage from "@/pages/home";
import ListPropertyPage from "@/pages/list-property";
import SubmissionConfirmedPage from "@/pages/submission-confirmed";
import BrowsePropertiesPage from "@/pages/browse-properties";
import PropertyDetailPage from "@/pages/property-detail";
import BrokerLoginPage from "@/pages/broker-login";
import BrokerDashboardPage from "@/pages/broker-dashboard";
import BrokerBrowsePage from "@/pages/broker-browse";
import AdminAnalyticsPage from "@/pages/admin-analytics";
import NotFound from "@/pages/not-found";

function Router() {
  // Send heartbeat to track active users
  useActiveUserHeartbeat();
  
  // Track page views for analytics
  usePageView();
  
  return (
    <>
      <ScrollToTop />
      <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/list-property" component={ListPropertyPage} />
      <Route path="/submission-confirmed" component={SubmissionConfirmedPage} />
      <Route path="/browse-properties" component={BrowsePropertiesPage} />
      <Route path="/property/:id" component={PropertyDetailPage} />
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
