import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MapPin, BedDouble, Bath, SlidersHorizontal, X, Eye, Sofa, Building2, ChevronDown, Waves, Wind, Wifi, Car, Users, Flame, ArrowUpDown, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { PropertyWithMedia } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/navbar";
import { SEO } from "@/components/seo";
import { generatePropertyUrl, frenchTitle } from "@/lib/utils";

const BROKER_PHONE = "50344187";
const BROKER_PHONE_DISPLAY = "50 344 187";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className={className} fill="currentColor">
    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zM223.9 413.4c-33 0-65.4-8.9-94-25.7l-6.7-4-69.8 18.3L72 334.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
  </svg>
);

export default function BrowsePropertiesPage() {
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [selectedRooms, setSelectedRooms] = useState<number | null>(null);
  const [selectedBathrooms, setSelectedBathrooms] = useState<number | null>(null);
  const [selectedGuests, setSelectedGuests] = useState<number | null>(null);
  const [furnishedFilter, setFurnishedFilter] = useState<"all" | "furnished" | "semi-furnished" | "unfurnished">("all");
  const [reqAC, setReqAC] = useState(false);
  const [reqWiFi, setReqWiFi] = useState(false);
  const [reqParking, setReqParking] = useState(false);
  const [distanceSearch, setDistanceSearch] = useState<string>("all");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "cheapest" | "expensive" | "beach" | "most_viewed">("default");
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  
  // Hero section search states
  const [startDay, setStartDay] = useState("");
  const [startMonth, setStartMonth] = useState("06");
  const [endDay, setEndDay] = useState("");
  const [endMonth, setEndMonth] = useState("06");

  // Scroll tracking for Hero Parallax and Fade
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Calculate parallax values
  const heroHeight = 650;
  let fadeRatio = 1 - (scrollY / (heroHeight * 1.2));
  fadeRatio = Math.max(0, Math.min(1, fadeRatio));
  const parallaxTranslateY = scrollY * 0.2;

  const { data: properties, isLoading } = useQuery<PropertyWithMedia[]>({
    queryKey: ['/api/properties'],
  });

  const { data: propertyViews } = useQuery<{
    propertyId: string;
    totalViews: number;
  }[]>({
    queryKey: ['/api/properties/views'],
  });

  const viewsMap = useMemo(() => {
    const map = new Map<string, number>();
    if (propertyViews) {
      for (const v of propertyViews) {
        map.set(v.propertyId, v.totalViews ?? 0);
      }
    }
    return map;
  }, [propertyViews]);

  // Helper: parse "X minutes" string to a number for sorting
  const parseBeachDistance = (dist: string | null | undefined): number => {
    if (!dist) return 9999;
    const match = dist.match(/(\d+)/);
    return match ? parseInt(match[1]) : 9999;
  };

  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    let result = properties.filter((property) => {
      const price = parseFloat(property.price);
      if (minPrice && price < parseFloat(minPrice)) return false;
      if (maxPrice && price > parseFloat(maxPrice)) return false;
      if (selectedRooms !== null && property.rooms !== selectedRooms) return false;
      if (selectedBathrooms !== null && property.bathrooms !== selectedBathrooms) return false;
      if (furnishedFilter === "furnished" && !property.isFurnished) return false;
      if (furnishedFilter === "unfurnished" && property.isFurnished) return false;
      if (reqAC && !property.hasAC) return false;
      if (reqWiFi && !property.hasWiFi) return false;
      if (reqParking && !property.hasParking) return false;
      if (distanceSearch && distanceSearch !== "all" && property.distanceToBeach !== distanceSearch) return false;
      return true;
    });

    // Apply sorting
    if (sortBy === "cheapest") {
      result = [...result].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortBy === "expensive") {
      result = [...result].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    } else if (sortBy === "beach") {
      result = [...result].sort((a, b) => parseBeachDistance(a.distanceToBeach) - parseBeachDistance(b.distanceToBeach));
    } else if (sortBy === "most_viewed") {
      result = [...result].sort((a, b) => (viewsMap.get(b.id) ?? 0) - (viewsMap.get(a.id) ?? 0));
    }

    return result;
  }, [properties, minPrice, maxPrice, selectedRooms, selectedBathrooms, selectedGuests, furnishedFilter, reqAC, reqWiFi, reqParking, distanceSearch, sortBy, viewsMap]);

  const clearFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setSelectedRooms(null);
    setSelectedBathrooms(null);
    setSelectedGuests(null);
    setFurnishedFilter("all");
    setReqAC(false);
    setReqWiFi(false);
    setReqParking(false);
    setDistanceSearch("all");
    setSortBy("default");
  };

  const hasActiveFilters = minPrice || maxPrice || selectedRooms !== null || selectedBathrooms !== null || furnishedFilter !== "all" || selectedGuests !== null || reqAC || reqWiFi || reqParking || (distanceSearch !== "all" && distanceSearch !== "");
  const activeFilterCount = [minPrice, maxPrice, selectedRooms !== null, selectedBathrooms !== null, furnishedFilter !== "all", selectedGuests !== null, reqAC, reqWiFi, reqParking, distanceSearch !== "all" && distanceSearch !== ""].filter(Boolean).length;

  const seoDescription = `${filteredProperties.length} logements disponibles à Kelibia. Trouvez votre appartement idéal.`;

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={`${filteredProperties.length} Logements à Louer à Kelibia | Maisons, Appartements, Villas | Laith Kelibia`}
        description={`Parcourez ${filteredProperties.length} logements vérifiés à Kelibia : maisons S+2, S+3, appartements meublés, villas vue mer, studios. Location vacances été, courte ou longue durée au Cap Bon.`}
        keywords="location kelibia, maison s+2 kelibia, location appartement meublé kelibia, villa à louer kelibia, maison vacances kelibia, location saisonnière été kelibia, studio kelibia plage, logement kelibia cap bon, location courte durée kelibia, dar kelibia, immobilier kelibia tunisie, maison s+1 kelibia, location bord de mer kelibia"
        url="https://laith-kelibia.tn/browse-properties"
      />
      <Navbar />
      
      {/* Background Image Container (Parallax + Fade) */}
      <div 
        className="absolute top-0 left-0 w-full h-[320px] sm:h-[380px] lg:h-[480px] z-0 pointer-events-none overflow-hidden"
        style={{ opacity: fadeRatio }}
      >
        {/* The Image with Parallax Transform */}
        <div 
          className="absolute inset-0 w-full h-[120%] bg-cover bg-center will-change-transform"
          style={{ 
            backgroundImage: `url('/kelibia%20plage.png')`,
            transform: `translateY(${parallaxTranslateY}px)`
          }}
        />
        
        {/* Soft edge blending gradient overlay covering the whole container */}
        <div 
          className="absolute inset-0 w-full h-full z-10"
          style={{
            background: 'linear-gradient(to bottom, hsl(var(--background)) 0%, rgba(255,255,255,0) 25%, rgba(255,255,255,0) 70%, hsl(var(--background)) 100%)'
          }}
        />
        
        {/* Subtle Dark overlay for text readability (between image and blending gradient) */}
        <div className="absolute inset-0 bg-black/15 z-0" />
        
        {/* Top-to-bottom dark gradient for header visibility */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/40 to-transparent z-10 pointer-events-none" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 w-full max-w-5xl px-4 flex flex-col items-center text-center animate-fade-in-up pt-20 sm:pt-24 lg:pt-28 pb-8 sm:pb-12 mx-auto">
        <h1 className="text-3xl sm:text-4xl lg:text-[3.25rem] font-extrabold text-white tracking-tight mb-3 sm:mb-5 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] leading-snug" dir="rtl">
          أفضل عروض الكراء الصيفي <br className="hidden sm:block" />
          <span className="inline-block mt-1 sm:mt-2">في قليبية 🌊🏖️</span>
        </h1>
        <p className="text-base sm:text-lg lg:text-xl text-white mb-6 sm:mb-8 max-w-2xl font-medium drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" dir="rtl">
          منازل وشقق مختارة بعناية 🏡، مع صور وأسعار واضحة 📸💰 لتجربة حجز سهلة وسريعة ⚡
        </p>


        </div>

      {/* Mobile Filter Bar — horizontal pills */}
      <div className="lg:hidden px-4 pb-3 pt-6 relative z-20 bg-background">
        {/* Quick filter pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold border transition-all ${
              hasActiveFilters
                ? "bg-[#E6F7F7] text-primary border-primary/30"
                : "bg-card border-border/60 text-foreground"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtres
            {activeFilterCount > 0 && (
              <span className="bg-primary/20 text-primary rounded-full px-1.5 text-[10px]">{activeFilterCount}</span>
            )}
          </button>
          
          {/* Quick type pills */}
          {(["all", "furnished", "unfurnished"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFurnishedFilter(furnishedFilter === type && type !== "all" ? "all" : type)}
              className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-bold border transition-all ${
                furnishedFilter === type
                  ? "bg-[#E6F7F7] text-primary border-primary/30 shadow-sm"
                  : "bg-card border-border/60 text-muted-foreground"
              }`}
            >
              {type === "all" ? "Tous" : type === "furnished" ? "Meublé" : "Non meublé"}
            </button>
          ))}

          {/* Quick room pills */}
          {[1, 2, 3].map((num) => (
            <button
              key={`room-${num}`}
              onClick={() => setSelectedRooms(selectedRooms === num ? null : num)}
              className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-bold border transition-all ${
                selectedRooms === num
                  ? "bg-[#E6F7F7] text-primary border-primary/30 shadow-sm"
                  : "bg-card border-border/60 text-muted-foreground"
              }`}
            >
              {num} ch.
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Filters Full-screen Overlay */}
      {mobileFiltersOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden animate-fade-in"
          onClick={() => setMobileFiltersOpen(false)}
        >
          <div 
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl overflow-y-auto max-h-[85vh] p-5 animate-slide-up shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
            
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Filtres</h2>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-primary font-medium">
                    Réinitialiser
                  </button>
                )}
                <button 
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/60"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2 mb-5">
              <Label className="text-sm font-semibold">Prix (TND / nuit)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="h-11 text-base rounded-xl"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="h-11 text-base rounded-xl"
                />
              </div>
            </div>

            {/* Type */}
            <div className="space-y-2 mb-5">
              <Label className="text-sm font-semibold">Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "all" as const, label: "Tous" },
                  { value: "furnished" as const, label: "Meublé" },
                  { value: "semi-furnished" as const, label: "Semi-meublé" },
                  { value: "unfurnished" as const, label: "Non meublé" },
                ]).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setFurnishedFilter(value)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      furnishedFilter === value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/40 text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rooms */}
            <div className="space-y-2 mb-5">
              <Label className="text-sm font-semibold">Chambres</Label>
              <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelectedRooms(selectedRooms === num ? null : num)}
                    className={`h-10 rounded-xl text-sm font-semibold transition-all ${
                      selectedRooms === num
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/40 text-foreground"
                    }`}
                  >
                    {num === 0 ? "S" : num}
                  </button>
                ))}
              </div>
            </div>

            {/* Bathrooms */}
            <div className="space-y-2 mb-5">
              <Label className="text-sm font-semibold">Salles de bain</Label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelectedBathrooms(selectedBathrooms === num ? null : num)}
                    className={`h-10 rounded-xl text-sm font-semibold transition-all ${
                      selectedBathrooms === num
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/40 text-foreground"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>


            {/* Amenities */}
            <div className="space-y-3 mb-5">
              <Label className="text-sm font-semibold">Équipements</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="reqAC-mobile" checked={reqAC} onCheckedChange={(c) => setReqAC(c as boolean)} />
                  <Label htmlFor="reqAC-mobile" className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                    <Wind className="h-4 w-4 text-muted-foreground" /> Climatisation
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="reqWiFi-mobile" checked={reqWiFi} onCheckedChange={(c) => setReqWiFi(c as boolean)} />
                  <Label htmlFor="reqWiFi-mobile" className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                    <Wifi className="h-4 w-4 text-muted-foreground" /> WiFi
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="reqParking-mobile" checked={reqParking} onCheckedChange={(c) => setReqParking(c as boolean)} />
                  <Label htmlFor="reqParking-mobile" className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                    <Car className="h-4 w-4 text-muted-foreground" /> Parking
                  </Label>
                </div>
              </div>
            </div>

            {/* Distance to beach */}
            <div className="space-y-2 mb-6">
              <Label className="text-sm font-semibold">Distance à la plage sur pieds</Label>
              <Select value={distanceSearch} onValueChange={setDistanceSearch}>
                <SelectTrigger className="h-11 text-base rounded-xl">
                  <div className="flex items-center gap-2">
                    <Waves className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Toutes distances" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes distances</SelectItem>
                  <SelectItem value="3 minutes">3 minutes</SelectItem>
                  <SelectItem value="5 minutes">5 minutes</SelectItem>
                  <SelectItem value="7 minutes">7 minutes</SelectItem>
                  <SelectItem value="10 minutes">10 minutes</SelectItem>
                  <SelectItem value="15 minutes">15 minutes</SelectItem>
                  <SelectItem value="20 minutes">20 minutes</SelectItem>
                  <SelectItem value="25 minutes">25 minutes</SelectItem>
                  <SelectItem value="30 minutes">30 minutes</SelectItem>
                  <SelectItem value="35 minutes">35 minutes</SelectItem>
                  <SelectItem value="40 minutes">40 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sorting */}
            <div className="space-y-2 mb-6">
              <Label className="text-sm font-semibold">Trier par</Label>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="h-11 text-base rounded-xl">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Par défaut" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Par défaut</SelectItem>
                  <SelectItem value="cheapest">Prix croissant</SelectItem>
                  <SelectItem value="expensive">Prix décroissant</SelectItem>
                  <SelectItem value="beach">Plus proche de la plage</SelectItem>
                  <SelectItem value="most_viewed">Les plus consultés</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Apply button */}
            <button
              onClick={() => setMobileFiltersOpen(false)}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm"
            >
              Voir {filteredProperties.length} résultat{filteredProperties.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto pb-8">
        <div className="flex flex-col lg:flex-row gap-6 px-4 sm:px-6 xl:px-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-card rounded-2xl border border-border/40 p-5 space-y-4 sticky top-16 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                  Filtres
                </h2>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-[11px] text-primary font-medium">
                    Réinitialiser
                  </button>
                )}
              </div>

              <Separator className="bg-border/30" />

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Prix (TND / nuit)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="h-9 text-sm rounded-xl" />
                  <Input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="h-9 text-sm rounded-xl" />
                </div>
              </div>

              <Separator className="bg-border/30" />

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Type</Label>
                <div className="grid grid-cols-1 gap-1">
                  {([
                    { value: "all" as const, label: "Tous" },
                    { value: "furnished" as const, label: "Meublé" },
                    { value: "semi-furnished" as const, label: "Semi-meublé" },
                    { value: "unfurnished" as const, label: "Non meublé" },
                  ]).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setFurnishedFilter(value)}
                      className={`text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        furnishedFilter === value
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-border/30" />

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Chambres</Label>
                <div className="grid grid-cols-5 gap-1">
                  {[0, 1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      onClick={() => setSelectedRooms(selectedRooms === num ? null : num)}
                      className={`h-8 rounded-lg text-xs font-semibold transition-all ${
                        selectedRooms === num
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/30 text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {num === 0 ? "S" : num}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-border/30" />

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Salles de bain</Label>
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      onClick={() => setSelectedBathrooms(selectedBathrooms === num ? null : num)}
                      className={`h-8 rounded-lg text-xs font-semibold transition-all ${
                        selectedBathrooms === num
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/30 text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>


              <Separator className="bg-border/30" />

              <div className="space-y-3">
                <Label className="text-xs font-semibold">Équipements</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="reqAC-desk" checked={reqAC} onCheckedChange={(c) => setReqAC(c as boolean)} />
                    <Label htmlFor="reqAC-desk" className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                      <Wind className="h-3.5 w-3.5 text-muted-foreground" /> Climatisation
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="reqWiFi-desk" checked={reqWiFi} onCheckedChange={(c) => setReqWiFi(c as boolean)} />
                    <Label htmlFor="reqWiFi-desk" className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                      <Wifi className="h-3.5 w-3.5 text-muted-foreground" /> WiFi
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="reqParking-desk" checked={reqParking} onCheckedChange={(c) => setReqParking(c as boolean)} />
                    <Label htmlFor="reqParking-desk" className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                      <Car className="h-3.5 w-3.5 text-muted-foreground" /> Parking
                    </Label>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/30" />

              <div className="space-y-2 pb-2">
                <Label className="text-xs font-semibold">Distance à la plage sur pieds</Label>
                <Select value={distanceSearch} onValueChange={setDistanceSearch}>
                  <SelectTrigger className="h-8 text-xs rounded-lg">
                    <div className="flex items-center gap-2">
                      <Waves className="h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue placeholder="Toutes distances" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes distances</SelectItem>
                    <SelectItem value="3 minutes">3 minutes</SelectItem>
                    <SelectItem value="5 minutes">5 minutes</SelectItem>
                    <SelectItem value="7 minutes">7 minutes</SelectItem>
                    <SelectItem value="10 minutes">10 minutes</SelectItem>
                    <SelectItem value="15 minutes">15 minutes</SelectItem>
                    <SelectItem value="20 minutes">20 minutes</SelectItem>
                    <SelectItem value="25 minutes">25 minutes</SelectItem>
                    <SelectItem value="30 minutes">30 minutes</SelectItem>
                    <SelectItem value="35 minutes">35 minutes</SelectItem>
                    <SelectItem value="40 minutes">40 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-border/30" />

              <div className="space-y-2 pb-2">
                <Label className="text-xs font-semibold">Trier par</Label>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="h-8 text-xs rounded-lg">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue placeholder="Par défaut" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Par défaut</SelectItem>
                    <SelectItem value="cheapest">Prix croissant</SelectItem>
                    <SelectItem value="expensive">Prix décroissant</SelectItem>
                    <SelectItem value="beach">Plus proche de la plage</SelectItem>
                    <SelectItem value="most_viewed">Les plus consultés</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <>
                  <Separator className="bg-border/30" />
                  <p className="text-[11px] text-muted-foreground text-center">
                    {filteredProperties.length} résultat{filteredProperties.length !== 1 ? 's' : ''}
                  </p>
                </>
              )}
            </div>
          </aside>

          {/* Properties */}
          <main className="flex-1 min-w-0">
            {/* Results count + sort badge — mobile */}
            {!isLoading && (
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{filteredProperties.length}</span> logement{filteredProperties.length !== 1 ? 's' : ''}
                </p>
                {sortBy !== "default" && (
                  <button 
                    onClick={() => setSortBy("default")}
                    className="text-[10px] text-primary bg-primary/10 px-2 py-1 rounded-full font-medium flex items-center gap-1"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    {sortBy === "cheapest" ? "Prix ↑" : sortBy === "expensive" ? "Prix ↓" : sortBy === "beach" ? "Plage" : "Vues"}
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-card rounded-xl overflow-hidden border border-border/30">
                    <Skeleton className="aspect-[3/4] sm:aspect-[4/3] w-full" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-4 w-2/3 rounded" />
                      <Skeleton className="h-3 w-full rounded" />
                      <Skeleton className="h-3 w-1/2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty */}
            {!isLoading && filteredProperties.length === 0 && (
              <div className="text-center py-16 animate-fade-in">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-4">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  {properties && properties.length > 0 ? "Aucun résultat" : "Aucune annonce"}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {properties && properties.length > 0 
                    ? "Ajustez vos filtres"
                    : "Revenez bientôt!"
                  }
                </p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-sm text-primary font-medium">
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            )}

            {/* Property Cards — 2 columns on mobile, 3 on desktop */}
            {!isLoading && filteredProperties.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 stagger-children">
                {filteredProperties.map((property, index) => {
                  const primaryMedia = property.media.find(m => m.isPrimary) || property.media[0];
                  const price = parseFloat(property.price);
                  const views = viewsMap.get(property.id) ?? 0;
                  
                  const hasPromo = property.promoPrice && parseFloat(property.promoPrice) > 0;
                  const currentDailyPrice = hasPromo ? parseFloat(property.promoPrice as string) : price;
                  
                  const hasWeekly = property.pricePerWeek && parseFloat(property.pricePerWeek) > 0;
                  const weeklyPriceBase = hasWeekly ? parseFloat(property.pricePerWeek as string) : 0;
                  const currentWeeklyPrice = hasPromo && hasWeekly ? Math.ceil(weeklyPriceBase * (currentDailyPrice / price)) : weeklyPriceBase;
                  const savingsPerNight = hasWeekly ? Math.floor(currentDailyPrice - (currentWeeklyPrice / 7)) : 0;
                  
                  return (
                    <Link key={property.id} href={generatePropertyUrl(property)}>
                      <div className="property-card bg-card rounded-xl overflow-hidden border border-border/30 h-full flex flex-col cursor-pointer group">
                        {/* Image — taller on mobile for thumb-friendly tapping */}
                        <div className="relative aspect-[3/4] sm:aspect-[4/3] overflow-hidden bg-muted/20">
                          {primaryMedia ? (
                            primaryMedia.mimeType.startsWith('video/') ? (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                                <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm">
                                  <div className="w-0 h-0 border-l-[10px] border-l-white border-y-[7px] border-y-transparent ml-1" />
                                </div>
                              </div>
                            ) : (
                                <img
                                  src={primaryMedia.url}
                                  alt={property.title}
                                  className="card-image w-full h-full object-cover"
                                  loading={index < 4 ? "eager" : "lazy"}
                                  decoding="async"
                                />
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted/10">
                              <Building2 className="w-8 h-8 text-muted-foreground/20" />
                            </div>
                          )}
                          
                          {/* Promo Ribbon */}
                          {property.promoPrice && parseFloat(property.promoPrice) > 0 && (
                            <div className="absolute top-0 right-0 z-10 w-24 h-24 overflow-hidden pointer-events-none">
                              <div className="absolute top-4 -right-8 w-32 bg-gradient-to-r from-[#FF4500] to-[#FF8C00] text-white text-center text-[10px] font-black uppercase tracking-wider py-1 shadow-lg transform rotate-45 border-y border-white/20">
                                {property.promoLabel || "PROMO"}
                              </div>
                            </div>
                          )}
                          
                          {/* Badges */}
                          <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-none">
                            <div className="flex flex-col gap-1.5 items-start">
                              {views > 30 ? (
                                <span className="bg-[#FF385C] text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                                  <Flame className="w-3 h-3" /> Très demandé
                                </span>
                              ) : views <= 10 ? (
                                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                                  Nouveau
                                </span>
                              ) : null}
                              
                              {property.distanceToBeach && (
                                <span className="bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                                  <Waves className="w-3 h-3" /> {property.distanceToBeach}
                                </span>
                              )}
                            </div>
                            
                          </div>

                        </div>

                        {/* Info */}
                        <div className="p-2.5 sm:p-3 flex-1 flex flex-col">
                          <h3 className="font-semibold text-foreground text-xs sm:text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                            {frenchTitle(property.title, property.rooms)}
                          </h3>
                          
                          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground mb-2">
                            <MapPin className="w-3 h-3 flex-shrink-0 text-primary/50" />
                            <span className="truncate">{/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(property.location.trim()) ? "Kélibia" : property.location}</span>
                          </div>
                          
                          {/* Room/Bath pills & Price */}
                          <div className="mt-auto flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-0.5 text-[10px] sm:text-xs font-medium text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
                                  <BedDouble className="w-3 h-3" />
                                  <span>{property.rooms}</span>
                                </div>
                                <div className="flex items-center gap-0.5 text-[10px] sm:text-xs font-medium text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
                                  <Bath className="w-3 h-3" />
                                  <span>{property.bathrooms}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                {property.promoPrice && parseFloat(property.promoPrice) > 0 ? (
                                  <>
                                    <div className="flex items-center gap-1.5 mb-[-2px]">
                                      <span className="text-[10px] font-bold text-red-500/60 line-through decoration-red-500/40">
                                        {price.toLocaleString()} TND
                                      </span>
                                      <span className="bg-red-100 text-red-600 text-[9px] font-black px-1 rounded">
                                        -{Math.round((1 - parseFloat(property.promoPrice) / price) * 100)}%
                                      </span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                      <span className="font-black text-lg sm:text-xl text-[#FF4500] tracking-tight animate-pulse-subtle shadow-orange-500/20 drop-shadow-sm">
                                        {parseFloat(property.promoPrice).toLocaleString()}
                                      </span>
                                      <span className="font-bold text-[10px] sm:text-xs text-[#FF4500]/80 uppercase tracking-wider">
                                        TND
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex items-baseline gap-1">
                                    <span className="font-black text-lg sm:text-xl text-foreground tracking-tight">
                                      {price.toLocaleString()}
                                    </span>
                                    <span className="font-bold text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                                      TND
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {hasWeekly && (
                              <div className="flex flex-col items-end mt-0.5 w-full">
                                {hasPromo && (
                                  <div className="flex justify-end w-full mb-[-2px]">
                                    <span className="text-[9px] font-bold text-red-500/60 line-through decoration-red-500/40">
                                      {weeklyPriceBase.toLocaleString()} TND
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between w-full gap-1">
                                  <div className="shrink-0">
                                    {savingsPerNight > 0 && (
                                      <span className={`whitespace-nowrap text-[8.5px] sm:text-[9px] font-bold px-1 py-0.5 rounded-sm border ${hasPromo ? 'bg-orange-100 text-orange-700 border-orange-200 shadow-sm animate-pulse-subtle' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                        {hasPromo ? '🔥' : '💰'} Éco {savingsPerNight} TND/n.
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-baseline gap-0.5 whitespace-nowrap shrink-0">
                                    <span className={`font-black text-xs sm:text-base tracking-tight ${hasPromo ? 'text-[#FF4500]' : 'text-emerald-600'}`}>
                                      {currentWeeklyPrice.toLocaleString()}
                                    </span>
                                    <span className={`font-bold text-[8.5px] sm:text-[10px] uppercase tracking-wider ${hasPromo ? 'text-[#FF4500]/80' : 'text-emerald-600'}`}>
                                      TND
                                    </span>
                                    <span className={`font-bold text-[8.5px] sm:text-[10px] uppercase tracking-wider ml-0.5 ${hasPromo ? 'text-[#FF4500]/70' : 'text-emerald-500'}`}>
                                      / sem
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Footer - extra bottom padding on mobile for sticky bar */}
      <footer className="py-6 pb-20 lg:pb-6 border-t border-border/30">
        <div className="text-center">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} laith-kelibia
          </p>
        </div>
      </footer>

      {/* Mobile Sticky Reserve Button */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/98 backdrop-blur-lg border-t border-border/40 px-4 py-2.5 pb-4 z-[100] shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.15)]">
        <Button
          className="w-full bg-gradient-to-r from-[#FF385C] to-[#D80765] hover:opacity-95 text-white font-black py-4 rounded-xl shadow-lg shadow-rose-500/25 transition-all active:scale-[0.98] border-0 text-base"
          onClick={() => {
            fetch('/api/analytics/browse-reserve-click', { method: 'POST', keepalive: true }).catch(console.error);
            setContactDialogOpen(true);
          }}
        >
          Réserver maintenant !
        </Button>
      </div>

      {/* Contact Options Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-md mx-auto w-[90vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">Options de contact</DialogTitle>
            <DialogDescription className="text-center">

            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              className="w-full justify-between text-lg py-7 h-auto rounded-2xl shadow-md transition-transform active:scale-[0.98] bg-gradient-to-r from-[#FF385C] to-[#D80765] hover:opacity-90 text-white border-0"
              onClick={() => {
                setContactDialogOpen(false);
                window.location.href = `tel:${BROKER_PHONE}`;
              }}
            >
              <div className="flex flex-col items-start">
                <span className="font-bold">Appeler par Téléphone</span>
                <span className="text-xs opacity-90">{BROKER_PHONE_DISPLAY}</span>
              </div>
              <Phone className="w-6 h-6" />
            </Button>

            <Button
              className="w-full justify-between text-lg py-7 h-auto rounded-2xl shadow-md transition-transform active:scale-[0.98] bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:opacity-90 text-white border-0"
              onClick={() => {
                setContactDialogOpen(false);
                const message = `Bonjour, je suis intéressé(e) par vos logements disponibles à Kélibia. Pourriez-vous m'envoyer plus de détails ?`;
                window.open(`https://wa.me/216${BROKER_PHONE}?text=${encodeURIComponent(message)}`, '_blank');
              }}
            >
              <div className="flex flex-col items-start">
                <span className="font-bold">Réserver par WhatsApp</span>
                <span className="text-xs opacity-90">{BROKER_PHONE_DISPLAY}</span>
              </div>
              <WhatsAppIcon className="w-7 h-7" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
