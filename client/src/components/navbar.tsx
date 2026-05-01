import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, BarChart3, Plus, LayoutGrid } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: authStatus } = useQuery<{ isAuthenticated: boolean }>({
    queryKey: ['/api/broker/auth-status'],
  });
  
  const isAdmin = authStatus?.isAuthenticated;

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/broker/logout', {});
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/broker/auth-status'] });
      await queryClient.refetchQueries({ queryKey: ['/api/broker/auth-status'] });
      toast({ title: "Déconnecté", description: "Vous avez été déconnecté." });
      setLocation('/');
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Échec.", variant: "destructive" });
    },
  });

  return (
    <nav className="sticky top-0 z-40 glass border-b border-border/30">
      <div className="px-4 py-2.5 sm:py-3 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Logo — compact on mobile */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer group">
              <img 
                src="/darna_logo-removebg-preview.png" 
                alt="laith-kelibia" 
                className="h-8 w-auto rounded-lg"
              />
              <span className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                laith-kelibia
              </span>
            </div>
          </Link>

          {/* Nav buttons — icon-only on mobile */}
          <div className="flex items-center gap-1">
            {isAdmin && location !== "/admin/analytics" && (
              <Link href="/admin/analytics">
                <Button variant="ghost" size="sm" className="h-8 w-8 sm:w-auto sm:h-9 sm:px-3 rounded-xl p-0 sm:p-2">
                  <BarChart3 className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline text-xs">Analytique</span>
                </Button>
              </Link>
            )}
            
            {isAdmin && location !== "/admin/browse" && (
              <Link href="/admin/browse">
                <Button variant="ghost" size="sm" className="h-8 w-8 sm:w-auto sm:h-9 sm:px-3 rounded-xl p-0 sm:p-2">
                  <LayoutGrid className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline text-xs">Admin</span>
                </Button>
              </Link>
            )}

            {isAdmin && location !== "/admin/list-property" && (
              <Link href="/admin/list-property">
                <Button size="sm" className="h-8 w-8 sm:w-auto sm:h-9 sm:px-3 rounded-xl p-0 sm:p-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                  <Plus className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline text-xs">Publier</span>
                </Button>
              </Link>
            )}

            {isAdmin && (
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="h-8 w-8 sm:w-auto sm:h-9 sm:px-3 rounded-xl p-0 sm:p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline text-xs">
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
