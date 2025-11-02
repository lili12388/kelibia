import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrokerAuthGuard } from "@/components/broker-auth-guard";
import HomePage from "@/pages/home";
import ListPropertyPage from "@/pages/list-property";
import SubmissionConfirmedPage from "@/pages/submission-confirmed";
import BrowsePropertiesPage from "@/pages/browse-properties";
import PropertyDetailPage from "@/pages/property-detail";
import BrokerLoginPage from "@/pages/broker-login";
import BrokerDashboardPage from "@/pages/broker-dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
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
      <Route component={NotFound} />
    </Switch>
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
