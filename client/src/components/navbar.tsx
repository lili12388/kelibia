import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, BarChart3, Plus, LayoutGrid, Phone, Menu, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const BROKER_PHONE = "50344187";
const BROKER_PHONE_DISPLAY = "50 344 187";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className={className} fill="currentColor">
    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zM223.9 413.4c-33 0-65.4-8.9-94-25.7l-6.7-4-69.8 18.3L72 334.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" className={className} fill="currentColor">
    <path d="M80 299.3V512H196V299.3h86.5l18-97.8H196V166.9c0-51.7 20.3-71.5 72.7-71.5c16.3 0 29.4 .4 37 1.2V7.9C291.4 4 256.4 0 236.2 0C129.3 0 80 50.5 80 159.4v42.1H14v97.8H80z"/>
  </svg>
);

const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=100063570427669&locale=fr_FR";

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const isHome = location === "/" || location === "/browse-properties";
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
      <div className="px-4 py-2 sm:py-3 sm:px-6 xl:px-8 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">

          {/* Logo + Brand Name — always visible */}
          <Link href="/">
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group">
              <img
                src="/logo.png"
                alt="Laith Kelibia"
                className="h-12 sm:h-24 w-auto object-contain"
              />
              <div className={`flex flex-col border-l pl-2 sm:pl-3 transition-colors duration-300 ${
                isTransparent ? "border-white/30" : "border-border/50"
              }`}>
                <span className={`text-xs sm:text-sm font-extrabold tracking-tight leading-tight transition-colors duration-300 ${
                  isTransparent ? "text-white" : "text-foreground"
                }`}>Laith Kelibia</span>
                <span className={`text-[8px] sm:text-[10px] font-semibold uppercase tracking-[0.15em] leading-tight transition-colors duration-300 ${
                  isTransparent ? "text-white/60" : "text-primary/60"
                }`}>Immobilière</span>
              </div>
            </div>
          </Link>

          {/* ===== DESKTOP NAV (sm+) ===== */}
          <div className="hidden sm:flex items-center gap-6">
            {/* Nav Links */}
            <div className="flex items-center gap-8">
              <Link href="/">
                <span className={`text-sm font-black transition-all duration-200 cursor-pointer drop-shadow-md ${
                  isTransparent 
                    ? "text-white hover:text-white/80" 
                    : location === "/" ? "text-primary" : "text-foreground/70 hover:text-primary"
                }`}>
                  Accueil
                </span>
              </Link>
              
              <Link href="/about">
                <span className={`text-sm font-black transition-all duration-200 cursor-pointer drop-shadow-md ${
                  isTransparent 
                    ? "text-white hover:text-white/80" 
                    : location === "/about" ? "text-primary" : "text-foreground/70 hover:text-primary"
                }`}>
                  À Propos
                </span>
              </Link>
            </div>

            {/* Facebook Button */}
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex items-center gap-2 h-11 px-5 rounded-full font-black text-sm shadow-md transition-all duration-300 active:scale-[0.98] border ${
                isTransparent
                  ? "bg-white/15 backdrop-blur-sm text-white border-white/30 hover:bg-[#1877F2] hover:border-[#1877F2] hover:text-white hover:shadow-lg hover:shadow-[#1877F2]/25"
                  : "border-primary/20 text-primary bg-primary/5 hover:bg-[#1877F2] hover:border-[#1877F2] hover:text-white hover:shadow-lg hover:shadow-[#1877F2]/20"
              }`}
            >
              <div className={`flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 ${
                isTransparent
                  ? "bg-white/20 group-hover:bg-white/25"
                  : "bg-primary/15 group-hover:bg-white/25"
              }`}>
                <FacebookIcon className={`w-3 h-3 transition-colors duration-300 ${
                  isTransparent ? "text-white" : "text-primary group-hover:text-white"
                }`} />
              </div>
              <span>Kelibia Annonces</span>
            </a>

            {/* Contact Button */}
            <Button 
              variant={isTransparent ? "default" : "outline"}
              size="sm"
              className={`h-11 px-6 rounded-full font-black text-sm shadow-md transition-all duration-300 active:scale-[0.98] hover:bg-[#32CD32] hover:border-[#32CD32] hover:text-white hover:shadow-lg hover:shadow-[#32CD32]/25 ${
                isTransparent 
                  ? "bg-white text-primary border-0" 
                  : "border-primary/20 text-primary bg-primary/5"
              }`}
              onClick={() => setContactDialogOpen(true)}
            >
              📞 50 344 187
            </Button>

            {/* Admin Controls — Desktop */}
            <div className="flex items-center gap-2">
              {isAdmin && location !== "/admin/analytics" && (
                <Link href="/admin/analytics">
                  <Button variant="ghost" size="sm" className="h-9 px-3 rounded-xl">
                    <BarChart3 className="h-4 w-4 mr-1.5" />
                    <span className="text-xs">Stats</span>
                  </Button>
                </Link>
              )}
              {isAdmin && location !== "/admin/browse" && (
                <Link href="/admin/browse">
                  <Button variant="ghost" size="sm" className="h-9 px-3 rounded-xl">
                    <LayoutGrid className="h-4 w-4 mr-1.5" />
                    <span className="text-xs">Admin</span>
                  </Button>
                </Link>
              )}
              {isAdmin && location !== "/admin/list-property" && (
                <Link href="/admin/list-property">
                  <Button size="sm" className="h-9 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                    <Plus className="h-4 w-4 mr-1.5" />
                    <span className="text-xs font-bold">Publier</span>
                  </Button>
                </Link>
              )}
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="h-9 px-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4 mr-1.5" />
                  <span className="text-xs">Quitter</span>
                </Button>
              )}
            </div>
          </div>

          {/* ===== MOBILE: Contact + Hamburger (sm:hidden) ===== */}
          <div className="flex sm:hidden items-center gap-2">
            {/* Contact button — always visible on mobile as CTA */}
            <Button 
              size="sm"
              className={`h-8 px-3 rounded-full font-bold text-[11px] shadow-md transition-all duration-300 active:scale-[0.98] ${
                isTransparent 
                  ? "bg-white text-primary border-0" 
                  : "border-primary/20 text-primary bg-primary/5 border"
              }`}
              onClick={() => setContactDialogOpen(true)}
            >
              📞 50 344 187
            </Button>

            {/* Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 active:scale-95 ${
                isTransparent
                  ? "text-white bg-white/15 backdrop-blur-sm border border-white/20"
                  : "text-foreground bg-muted/50 border border-border/40"
              }`}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* ===== MOBILE MENU PANEL ===== */}
      <div className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${
        mobileMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
      }`}>
        <div className={`px-4 pb-4 pt-2 border-t ${
          isTransparent 
            ? "bg-black/40 backdrop-blur-xl border-white/10" 
            : "bg-background/98 backdrop-blur-sm border-border/30"
        }`}>
          {/* Navigation Links */}
          <div className="flex flex-col gap-1 mb-3">
            <Link href="/">
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                location === "/" 
                  ? isTransparent ? "bg-white/15 text-white" : "bg-primary/10 text-primary"
                  : isTransparent ? "text-white/80 hover:bg-white/10" : "text-foreground/70 hover:bg-muted/50"
              }`}>
                <span className="text-sm font-bold">Accueil</span>
              </div>
            </Link>
            
            <Link href="/about">
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                location === "/about" 
                  ? isTransparent ? "bg-white/15 text-white" : "bg-primary/10 text-primary"
                  : isTransparent ? "text-white/80 hover:bg-white/10" : "text-foreground/70 hover:bg-muted/50"
              }`}>
                <span className="text-sm font-bold">À Propos</span>
              </div>
            </Link>
          </div>

          {/* Facebook Link */}
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-3 transition-all ${
              isTransparent 
                ? "text-white/80 hover:bg-white/10" 
                : "text-foreground/70 hover:bg-muted/50"
            }`}
          >
            <div className={`flex items-center justify-center w-7 h-7 rounded-full ${
              isTransparent ? "bg-white/20" : "bg-[#1877F2]/10"
            }`}>
              <FacebookIcon className={`w-3 h-3 ${
                isTransparent ? "text-white" : "text-[#1877F2]"
              }`} />
            </div>
            <span className="text-sm font-bold">Kelibia Annonces</span>
            <span className={`text-[10px] ml-auto ${
              isTransparent ? "text-white/40" : "text-muted-foreground/50"
            }`}>Facebook →</span>
          </a>

          {/* Admin Controls — Mobile */}
          {isAdmin && (
            <>
              <div className={`h-px mb-3 ${isTransparent ? "bg-white/10" : "bg-border/30"}`} />
              <div className="flex flex-col gap-1">
                {location !== "/admin/analytics" && (
                  <Link href="/admin/analytics">
                    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      isTransparent ? "text-white/80 hover:bg-white/10" : "text-foreground/70 hover:bg-muted/50"
                    }`}>
                      <BarChart3 className="h-4 w-4" />
                      <span className="text-sm font-bold">Statistiques</span>
                    </div>
                  </Link>
                )}
                {location !== "/admin/browse" && (
                  <Link href="/admin/browse">
                    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      isTransparent ? "text-white/80 hover:bg-white/10" : "text-foreground/70 hover:bg-muted/50"
                    }`}>
                      <LayoutGrid className="h-4 w-4" />
                      <span className="text-sm font-bold">Admin Panel</span>
                    </div>
                  </Link>
                )}
                {location !== "/admin/list-property" && (
                  <Link href="/admin/list-property">
                    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      isTransparent ? "text-white/80 hover:bg-white/10 text-white" : "text-primary hover:bg-primary/10"
                    }`}>
                      <Plus className="h-4 w-4" />
                      <span className="text-sm font-bold">Publier une Annonce</span>
                    </div>
                  </Link>
                )}
                <button
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left w-full ${
                    isTransparent ? "text-red-300 hover:bg-white/10" : "text-destructive hover:bg-destructive/10"
                  }`}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm font-bold">Déconnexion</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Unified Contact Modal */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-md mx-auto w-[90vw] rounded-3xl border-0 shadow-2xl overflow-hidden p-0">
          <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6 pt-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-center text-2xl font-black tracking-tight text-foreground">
                اتصل بنا
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground font-medium">
                Choisissez votre mode de communication préféré
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2">
              <Button
                className="w-full justify-between text-lg py-8 h-auto rounded-2xl shadow-lg transition-all active:scale-[0.98] bg-gradient-to-r from-[#FF385C] to-[#D80765] hover:opacity-90 text-white border-0"
                onClick={() => window.location.href = `tel:${BROKER_PHONE}`}
              >
                <div className="flex flex-col items-start">
                  <span className="font-bold text-base">Appeler par Téléphone</span>
                  <span className="text-sm opacity-90 font-medium">{BROKER_PHONE_DISPLAY}</span>
                </div>
                <div className="bg-white/20 p-2 rounded-full">
                  <Phone className="w-6 h-6" />
                </div>
              </Button>

              <Button
                className="w-full justify-between text-lg py-8 h-auto rounded-2xl shadow-lg transition-all active:scale-[0.98] bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:opacity-90 text-white border-0"
                onClick={() => window.open(`https://wa.me/216${BROKER_PHONE}`, '_blank')}
              >
                <div className="flex flex-col items-start">
                  <span className="font-bold text-base">Contactez-nous par WhatsApp</span>
                  <span className="text-sm opacity-90 font-medium">{BROKER_PHONE_DISPLAY}</span>
                </div>
                <div className="bg-white/20 p-2 rounded-full">
                  <WhatsAppIcon className="w-7 h-7" />
                </div>
              </Button>
            </div>

            <div className="mt-8 text-center">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                Laith Kelibia
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </nav>
  );
}
