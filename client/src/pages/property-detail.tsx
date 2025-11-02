import { useState } from "react";
import { Link, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, BedDouble, Bath, Maximize, Phone, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { PropertyWithMedia } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function PropertyDetailPage() {
  const [, params] = useRoute("/property/:id");
  const propertyId = params?.id;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { data: property, isLoading } = useQuery<PropertyWithMedia>({
    queryKey: ['/api/properties', propertyId],
    enabled: !!propertyId,
  });

  const nextImage = () => {
    if (property && property.media.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % property.media.length);
    }
  };

  const prevImage = () => {
    if (property && property.media.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + property.media.length) % property.media.length);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-background">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <Skeleton className="h-9 w-32" />
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="aspect-video w-full mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Property Not Found</h2>
          <Link href="/browse-properties">
            <Button>Browse Properties</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentMedia = property.media[currentImageIndex];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/browse-properties" data-testid="link-browse">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Properties
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Image Gallery */}
        <div className="mb-8">
          {property.media.length > 0 ? (
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                {currentMedia.mimeType.startsWith('image/') ? (
                  <img
                    src={currentMedia.url}
                    alt={property.title}
                    className="w-full h-full object-cover"
                    data-testid="img-main"
                  />
                ) : (
                  <video
                    src={currentMedia.url}
                    controls
                    className="w-full h-full object-cover"
                    data-testid="video-main"
                  />
                )}
                
                {/* Navigation Arrows */}
                {property.media.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2"
                      onClick={prevImage}
                      data-testid="button-prev-image"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      onClick={nextImage}
                      data-testid="button-next-image"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}
              </div>

              {/* Thumbnail Strip */}
              {property.media.length > 1 && (
                <div className="grid grid-cols-5 md:grid-cols-8 gap-2">
                  {property.media.map((media, index) => (
                    <button
                      key={media.id}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all hover-elevate ${
                        index === currentImageIndex 
                          ? 'border-primary' 
                          : 'border-transparent'
                      }`}
                      data-testid={`button-thumbnail-${index}`}
                    >
                      {media.mimeType.startsWith('image/') ? (
                        <img
                          src={media.url}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">Video</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
              <MapPin className="w-20 h-20 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Property Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-4" data-testid="text-title">
                {property.title}
              </h1>
              
              <div className="flex items-center gap-2 text-muted-foreground mb-6">
                <MapPin className="w-5 h-5" />
                <span className="text-lg" data-testid="text-location">{property.location}</span>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <BedDouble className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="font-semibold text-foreground" data-testid="text-rooms">{property.rooms}</div>
                    <div className="text-sm text-muted-foreground">Rooms</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Bath className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="font-semibold text-foreground" data-testid="text-bathrooms">{property.bathrooms}</div>
                    <div className="text-sm text-muted-foreground">Bathrooms</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Maximize className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="font-semibold text-foreground" data-testid="text-size">{property.sizeM2}m²</div>
                    <div className="text-sm text-muted-foreground">Size</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary mb-1" data-testid="text-price">
                      {parseFloat(property.price).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">TND / month</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-line leading-relaxed" data-testid="text-description">
                  {property.description}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Contact */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Contact Broker</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="text-3xl font-bold text-primary mb-2" data-testid="text-price-card">
                    {parseFloat(property.price).toLocaleString()} TND
                  </div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>

                <div className="space-y-3">
                  <Button className="w-full" size="lg" data-testid="button-contact-phone">
                    <Phone className="mr-2 h-5 w-5" />
                    Call Broker
                  </Button>
                  
                  <Button variant="outline" className="w-full" size="lg" data-testid="button-contact-email">
                    <Mail className="mr-2 h-5 w-5" />
                    Email Inquiry
                  </Button>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Our broker will help you arrange a viewing and answer any questions about this property.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
