import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { MapPin, BedDouble, Bath, Search, ChefHat, Refrigerator, Flame } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { PropertyWithMedia } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/navbar";

export default function BrowsePropertiesPage() {
  const { data: properties, isLoading } = useQuery<PropertyWithMedia[]>({
    queryKey: ['/api/properties'],
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Search Bar */}
      <div className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search properties..." 
                className="pl-10"
                data-testid="input-search"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-3">Available Properties</h1>
          <p className="text-muted-foreground text-lg">
            Browse verified properties in Hay Khadhra & Cité Olympique
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[4/3] w-full" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!properties || properties.length === 0) && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted text-muted-foreground mb-6">
              <MapPin className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-2" data-testid="text-empty-title">
              No Properties Available
            </h3>
            <p className="text-muted-foreground mb-6">
              Check back soon for new listings in your area.
            </p>
            <Link href="/list-property">
              <Button data-testid="button-list-property">
                List Your Property
              </Button>
            </Link>
          </div>
        )}

        {/* Property Grid */}
        {!isLoading && properties && properties.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {properties.map((property) => {
              const primaryMedia = property.media.find(m => m.isPrimary) || property.media[0];
              
              return (
                <Link key={property.id} href={`/property/${property.id}`} data-testid={`link-property-${property.id}`}>
                  <Card className="overflow-hidden hover-elevate active-elevate-2 transition-all h-full flex flex-col">
                    {/* Property Image */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      {primaryMedia ? (
                        <img
                          src={primaryMedia.url}
                          alt={property.title}
                          className="w-full h-full object-cover transition-transform hover:scale-105"
                          loading="lazy"
                          data-testid={`img-property-${property.id}`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      
                    </div>

                    {/* Property Info */}
                    <CardContent className="p-4 flex-1 flex flex-col">
                      <h3 className="font-semibold text-foreground text-lg mb-2 line-clamp-2" data-testid={`text-title-${property.id}`}>
                        {property.title}
                      </h3>
                      
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="line-clamp-1" data-testid={`text-location-${property.id}`}>{property.location}</span>
                      </div>
                      
                      {/* Metadata */}
                      <div className="flex items-center gap-3 mt-auto text-sm flex-wrap">
                        <div className="flex items-center gap-1 text-muted-foreground" data-testid={`text-rooms-${property.id}`}>
                          <BedDouble className="w-4 h-4" />
                          <span>{property.rooms}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground" data-testid={`text-bathrooms-${property.id}`}>
                          <Bath className="w-4 h-4" />
                          <span>{property.bathrooms}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground" data-testid={`text-kitchen-${property.id}`}>
                          <ChefHat className="w-4 h-4" />
                        </div>
                        {property.hasFridge && (
                          <div className="flex items-center gap-1 text-muted-foreground" data-testid={`text-fridge-${property.id}`}>
                            <Refrigerator className="w-4 h-4" />
                          </div>
                        )}
                        {property.hasGasStove && (
                          <div className="flex items-center gap-1 text-muted-foreground" data-testid={`text-gas-${property.id}`}>
                            <Flame className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4">
                        <Button variant="outline" className="w-full" data-testid={`button-view-details-${property.id}`}>
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
