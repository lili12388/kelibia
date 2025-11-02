import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface BrokerAuthGuardProps {
  children: React.ReactNode;
}

export function BrokerAuthGuard({ children }: BrokerAuthGuardProps) {
  const [, setLocation] = useLocation();

  const { data: authStatus, isLoading } = useQuery<{ isAuthenticated: boolean }>({
    queryKey: ['/api/broker/auth-status'],
  });

  useEffect(() => {
    if (!isLoading && authStatus && !authStatus.isAuthenticated) {
      setLocation('/broker/login');
    }
  }, [authStatus, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (authStatus && !authStatus.isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
