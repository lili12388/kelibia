import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Building2, LogOut, BarChart3, Plus, LayoutGrid } from "lucide-react";
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
      await queryClient.invalidateQueries({ queryKey: ['/api/broker/auth-status'] });
      await queryClient.refetchQueries({ queryKey: ['/api/broker/auth-status'] });
      
      toast({
        title: "Déconnecté",
        description: "Vous avez été déconnecté avec succès.",
      });
      setLocation('/');
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la déconnexion.",
        variant: "destructive",
      });
    },
  });

  return (
    <nav className="sticky top-0 z-40 glass border-b border-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer group">
              <img 
                src="/darna_logo-removebg-preview.png" 
                alt="Edarna" 
                className="h-9 sm:h-10 w-auto transition-all duration-300 group-hover:scale-105 rounded-lg"
              />
              <div className="hidden sm:block">
                <div className="font-bold text-base leading-tight text-foreground group-hover:text-primary transition-colors duration-200">
                  Edarna
                </div>
                <div className="text-[10px] text-muted-foreground font-medium tracking-wide">
                  Trouvez votre logement
                </div>
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Analytics Button - Only show for admin */}
            {isAdmin && location !== "/admin/analytics" && (
              <Link href="/admin/analytics">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-9 px-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                >
                  <BarChart3 className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline text-sm">Analytique</span>
                </Button>
              </Link>
            )}
            
            {/* Admin Browse Properties Button */}
            {isAdmin && location !== "/admin/browse" && (
              <Link href="/admin/browse">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-9 px-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                >
                  <LayoutGrid className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline text-sm">Admin</span>
                </Button>
              </Link>
            )}
            
            {/* Only show Browse button if not admin and not on home */}
            {!isAdmin && location !== "/" && (
              <Link href="/">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-9 px-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                >
                  <Building2 className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline text-sm">Parcourir</span>
                </Button>
              </Link>
            )}

            {/* List Property Button - Admin only */}
            {isAdmin && location !== "/admin/list-property" && (
              <Link href="/admin/list-property">
                <Button 
                  size="sm"
                  className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all"
                >
                  <Plus className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline text-sm">Publier</span>
                </Button>
              </Link>
            )}

            {/* Logout button - only show if admin is logged in */}
            {isAdmin && (
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="h-9 px-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              >
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline text-sm">
                  {logoutMutation.isPending ? "..." : "Quitter"}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
