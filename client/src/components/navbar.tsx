import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, BarChart3, Plus, LayoutGrid } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className={className} fill="currentColor">
    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zM223.9 413.4c-33 0-65.4-8.9-94-25.7l-6.7-4-69.8 18.3L72 334.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
  </svg>
);

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: authStatus } = useQuery<{ isAuthenticated: boolean }>({
    queryKey: ['/api/broker/auth-status'],
  });

  const isAdmin = authStatus?.isAuthenticated;

  // Scroll effect for transparent navbar on home page
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isHome = location === "/";
  const isTransparent = isHome && !scrolled;

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
    <nav className={`w-full z-50 transition-all duration-300 ${
      isHome ? 'fixed top-0' : 'sticky top-0'
    } ${isTransparent ? 'bg-transparent border-transparent' : 'glass border-b border-border/30 bg-background/95 shadow-sm'}`}>
      <div className="px-4 py-2.5 sm:py-3 sm:px-6 xl:px-8 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer group">
              <img
                src="/logo.png"
                alt="laith-kelibia"
                className="h-16 sm:h-20 w-auto object-contain"
              />
            </div>
          </Link>

          {/* Navigation Links & Actions */}
          <div className="flex items-center gap-1 sm:gap-4">
            
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6 mr-2">
              <Link href="/">
                <span className="text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer drop-shadow-sm">
                  Accueil
                </span>
              </Link>
              <Link href="/about">
                <span className="text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer drop-shadow-sm">
                  À Propos
                </span>
              </Link>
            </div>

            {/* Creative WhatsApp Button */}
            <a 
              href="https://wa.me/21650344187"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full font-bold text-xs sm:text-sm shadow-md transition-transform active:scale-95"
            >
              <WhatsAppIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Contactez-nous</span>
              <span className="sm:hidden">Contact</span>
            </a>
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
