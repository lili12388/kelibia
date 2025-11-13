import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Building2, LogOut, BarChart3 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface NavbarProps {
  variant?: "transparent" | "solid";
}

export default function Navbar({ variant = "solid" }: NavbarProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Check if user is admin
  const { data: authStatus } = useQuery<{ isAuthenticated: boolean }>({
    queryKey: ['/api/broker/auth-status'],
  });
  
  const isAdmin = authStatus?.isAuthenticated;

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/broker/logout', {});
      return await response.json();
    },
    onSuccess: async () => {
      // Invalidate and refetch auth status query to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ['/api/broker/auth-status'] });
      await queryClient.refetchQueries({ queryKey: ['/api/broker/auth-status'] });
      
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      setLocation('/');
    },
    onError: (error: any) => {
      toast({
        title: "Logout Failed",
        description: error.message || "Failed to logout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const navClasses = variant === "transparent" 
    ? "absolute top-0 left-0 right-0 z-20 bg-black/20 backdrop-blur-sm border-b border-white/10"
    : "sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm";

  const linkClasses = variant === "transparent"
    ? "text-white hover:bg-white/10"
    : "text-foreground hover:bg-accent";

  return (
    <nav className={navClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group">
              <img 
                src="/darna_logo-removebg-preview.png" 
                alt="Darna" 
                className="h-10 sm:h-12 w-auto transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-lg border-2 border-gray-300 rounded-lg p-2 bg-white"
              />
              <div className={`hidden sm:block ${variant === "transparent" ? "text-white" : "text-foreground"}`}>
                <div className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                  Darna
                </div>
                <div className={`text-xs ${variant === "transparent" ? "text-white/80" : "text-muted-foreground"}`}>
                  Find Your Home
                </div>
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Show Home button only for non-admin users */}
            {!isAdmin && location !== "/" && (
              <Link href="/">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={linkClasses}
                >
                  <Home className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Home</span>
                </Button>
              </Link>
            )}
            
            {/* Analytics Button - Only show for admin */}
            {isAdmin && location !== "/admin/analytics" && (
              <Link href="/admin/analytics">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={linkClasses}
                >
                  <BarChart3 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Analytics</span>
                </Button>
              </Link>
            )}
            
            {/* Admin Browse Properties Button */}
            {isAdmin && location !== "/admin/browse" && (
              <Link href="/admin/browse">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={linkClasses}
                >
                  <Building2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">View Posts as Admin</span>
                </Button>
              </Link>
            )}
            
            {/* Only show Browse button if not admin */}
            {!isAdmin && location !== "/browse-properties" && (
              <Link href="/browse-properties">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={linkClasses}
                >
                  <Building2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Browse</span>
                </Button>
              </Link>
            )}

            {/* List Property Button - Different routes for admin vs regular user */}
            {isAdmin ? (
              location !== "/admin/list-property" && (
                <Link href="/admin/list-property">
                  <Button 
                    variant={variant === "transparent" ? "outline" : "default"}
                    size="sm"
                    className={variant === "transparent" ? "border-white/30 text-white hover:bg-white/20" : ""}
                  >
                    <Building2 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Post Property as Admin</span>
                  </Button>
                </Link>
              )
            ) : (
              location !== "/list-property" && (
                <Link href="/list-property">
                  <Button 
                    variant={variant === "transparent" ? "outline" : "default"}
                    size="sm"
                    className={variant === "transparent" ? "border-white/30 text-white hover:bg-white/20" : ""}
                  >
                    <Building2 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">List Property</span>
                  </Button>
                </Link>
              )
            )}

            {/* Logout button - only show if admin is logged in */}
            {isAdmin && (
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className={`${linkClasses} ${variant === "transparent" ? "border border-white/30" : ""}`}
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">
                  {logoutMutation.isPending ? "Logging out..." : "Logout"}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
