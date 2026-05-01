import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MapPin, BedDouble, Bath, SlidersHorizontal, X, Eye, Sofa, Building2, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { PropertyWithMedia } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/navbar";
import { SEO } from "@/components/seo";

export default function BrowsePropertiesPage() {
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [selectedRooms, setSelectedRooms] = useState<number | null>(null);
  const [selectedBathrooms, setSelectedBathrooms] = useState<number | null>(null);
  const [furnishedFilter, setFurnishedFilter] = useState<"all" | "furnished" | "semi-furnished" | "unfurnished">("all");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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

  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    return properties.filter((property) => {
      const price = parseFloat(property.price);
      if (minPrice && price < parseFloat(minPrice)) return false;
      if (maxPrice && price > parseFloat(maxPrice)) return false;
      if (selectedRooms !== null && property.rooms !== selectedRooms) return false;
      if (selectedBathrooms !== null && property.bathrooms !== selectedBathrooms) return false;
      if (furnishedFilter === "furnished" && !property.isFurnished) return false;
      if (furnishedFilter === "unfurnished" && property.isFurnished) return false;
      return true;
    });
  }, [properties, minPrice, maxPrice, selectedRooms, selectedBathrooms, furnishedFilter]);

  const clearFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setSelectedRooms(null);
    setSelectedBathrooms(null);
    setFurnishedFilter("all");
  };

  const hasActiveFilters = minPrice || maxPrice || selectedRooms !== null || selectedBathrooms !== null || furnishedFilter !== "all";
  const activeFilterCount = [minPrice, maxPrice, selectedRooms !== null, selectedBathrooms !== null, furnishedFilter !== "all"].filter(Boolean).length;

  const seoDescription = `${filteredProperties.length} logements disponibles à Kelibia. Trouvez votre appartement idéal.`;

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={`${filteredProperties.length} Logements à Kelibia | laith-kelibia`}
        description={seoDescription}
        keywords="location appartement Kelibia, appartement meublé, location Tunisie"
      />
      <Navbar />
      
      {/* Compact Mobile Hero */}
      <div className="px-4 pt-5 pb-4 sm:px-6 sm:pt-8 sm:pb-6 max-w-7xl mx-auto">
        <div className="animate-fade-in-up">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            Logements à <span className="text-primary">Kelibia</span>
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Appartements vérifiés, prêts à louer
          </p>
        </div>
      </div>

      {/* Mobile Filter Bar — horizontal pills */}
      <div className="lg:hidden px-4 pb-3">
        {/* Quick filter pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all ${
              hasActiveFilters
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border/60 text-foreground"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtres
            {activeFilterCount > 0 && (
              <span className="bg-white/20 rounded-full px-1.5 text-[10px]">{activeFilterCount}</span>
            )}
          </button>
          
          {/* Quick type pills */}
          {(["all", "furnished", "unfurnished"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFurnishedFilter(furnishedFilter === type && type !== "all" ? "all" : type)}
              className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-medium border transition-all ${
                furnishedFilter === type
                  ? "bg-primary text-primary-foreground border-primary"
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
              className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-medium border transition-all ${
                selectedRooms === num
                  ? "bg-primary text-primary-foreground border-primary"
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
              <Label className="text-sm font-semibold">Prix (TND/mois)</Label>
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
      <div className="max-w-7xl mx-auto pb-8">
        <div className="flex flex-col lg:flex-row gap-6 px-4 sm:px-6">
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
                <Label className="text-xs font-semibold">Prix (TND/mois)</Label>
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
            {/* Results count — mobile */}
            {!isLoading && (
              <p className="text-xs text-muted-foreground mb-3">
                <span className="font-semibold text-foreground">{filteredProperties.length}</span> logement{filteredProperties.length !== 1 ? 's' : ''}
              </p>
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
                {filteredProperties.map((property) => {
                  const primaryMedia = property.media.find(m => m.isPrimary) || property.media[0];
                  const price = parseFloat(property.price);
                  const views = viewsMap.get(property.id) ?? 0;
                  
                  return (
                    <Link key={property.id} href={`/property/${property.id}`}>
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
                                loading="lazy"
                              />
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted/10">
                              <Building2 className="w-8 h-8 text-muted-foreground/20" />
                            </div>
                          )}
                          
                          {/* Badges */}
                          <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                            <div className="flex gap-1">
                              {property.isFurnished && (
                                <span className="glass-dark text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Sofa className="w-2.5 h-2.5" />
                                  Meublé
                                </span>
                              )}
                            </div>
                            {views > 0 && (
                              <span className="glass-dark text-white/80 text-[9px] font-medium px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                <Eye className="w-2.5 h-2.5" />
                                {views}
                              </span>
                            )}
                          </div>

                          {/* Price — bottom of image */}
                          <div className="absolute bottom-2 left-2">
                            <div className="bg-white/95 backdrop-blur-sm text-foreground font-bold text-xs sm:text-sm px-2 py-1 rounded-lg shadow-sm">
                              {price.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">TND</span>
                            </div>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-2.5 sm:p-3 flex-1 flex flex-col">
                          <h3 className="font-semibold text-foreground text-xs sm:text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                            {property.title}
                          </h3>
                          
                          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground mb-2">
                            <MapPin className="w-3 h-3 flex-shrink-0 text-primary/50" />
                            <span className="truncate">{property.location}</span>
                          </div>
                          
                          {/* Room/Bath pills */}
                          <div className="mt-auto flex items-center gap-1.5">
                            <div className="flex items-center gap-0.5 text-[10px] sm:text-xs font-medium text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
                              <BedDouble className="w-3 h-3" />
                              <span>{property.rooms}</span>
                            </div>
                            <div className="flex items-center gap-0.5 text-[10px] sm:text-xs font-medium text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
                              <Bath className="w-3 h-3" />
                              <span>{property.bathrooms}</span>
                            </div>
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

      {/* Footer */}
      <footer className="py-6 border-t border-border/30">
        <div className="text-center">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} laith-kelibia
          </p>
        </div>
      </footer>
    </div>
  );
}
