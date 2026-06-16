import { useState, useEffect, useRef } from "react";
import { Link, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft, MapPin, BedDouble, Bath, Phone, Mail,
  ChevronLeft, ChevronRight, User, Pencil, ChefHat,
  Refrigerator, Flame, Wind, Wifi, Car, Waves, Users,
  TriangleAlert, Microwave, Coffee, Home, Utensils, Info, Clock, ShieldCheck,
  Ban, NotebookText, Tv, WashingMachine, Sofa
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { PropertyWithMedia, PropertySubmissionWithMedia } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/navbar";
import { SEO } from "@/components/seo";
import { Helmet } from "react-helmet-async";
import AvailabilityTimeline from "@/components/availability-timeline";
import { frenchTitle } from "@/lib/utils";

// Broker contact info
const BROKER_PHONE = "50344187";
const BROKER_PHONE_DISPLAY = "50 344 187";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className={className} fill="currentColor">
    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zM223.9 413.4c-33 0-65.4-8.9-94-25.7l-6.7-4-69.8 18.3L72 334.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
  </svg>
);

export default function PropertyDetailPage() {
  const { toast } = useToast();

  const [, paramsProperty] = useRoute("/property/:id");
  const [, paramsMaisons] = useRoute("/maisons/:id");

  const fullId = paramsMaisons?.id || paramsProperty?.id;

  // Pass the full URL param to the API - server handles resolving UUID vs slug vs refcode
  let propertyId: string | undefined = undefined;
  if (fullId) {
    // For backward compat: extract UUID if present in old-format URLs (e.g., title-slug-UUID)
    const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    const uuidMatch = fullId.match(uuidRegex);
    if (uuidMatch) {
      propertyId = uuidMatch[0];
    } else {
      // It's a slug or refcode - pass as-is, server resolves
      propertyId = fullId;
    }
  }
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [neighborhoodMapFile, setNeighborhoodMapFile] = useState<File | null>(null);
  const [neighborhoodMapPreview, setNeighborhoodMapPreview] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [galleryPage, setGalleryPage] = useState(0);

  // Drag-to-scroll refs for desktop thumbnail strip
  const stripRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);

  const onStripMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.pageX - (stripRef.current?.offsetLeft || 0);
    dragScrollLeft.current = stripRef.current?.scrollLeft || 0;
    if (stripRef.current) stripRef.current.style.cursor = 'grabbing';
  };
  const onStripMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !stripRef.current) return;
    e.preventDefault();
    const x = e.pageX - (stripRef.current.offsetLeft || 0);
    const walk = (x - dragStartX.current) * 1.5;
    stripRef.current.scrollLeft = dragScrollLeft.current - walk;
  };
  const onStripMouseUp = () => {
    isDragging.current = false;
    if (stripRef.current) stripRef.current.style.cursor = 'grab';
  };

  // Swipe controls for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      nextImage();
    }
    if (isRightSwipe) {
      prevImage();
    }
  };

  const editForm = useForm({
    defaultValues: {
      title: "",
      propertyType: "Apartment",
      floorLevel: "",
      isFurnished: false,
      hasLivingRoom: false,
      hasFridge: false,
      hasGasStove: false,
      hasMicrowave: false,
      hasWashingMachine: false,
      hasAC: false,
      hasWiFi: false,
      hasParking: false,
      hasSeaView: false,
      description: "",
      rooms: 1,
      bathrooms: 1,
      location: "",
      referenceCode: "",
      distanceToBeach: "",
      nearbyPlaces: "[]",
      price: "",
      googleMapsUrl: "",
      showOwnerContact: false,
      showGoogleMaps: true,
      showExactLocation: false,
      showNeighborhoodMap: true,
      showPrice: true,
      showRooms: true,
      showBathrooms: true,
      showDescription: true,
    },
  });

  const { data: property, isLoading } = useQuery<PropertyWithMedia>({
    queryKey: ['/api/properties', propertyId],
    enabled: !!propertyId,
  });

  const { data: reservations = [] } = useQuery<any[]>({
    queryKey: ['/api/properties', property?.id, 'reservations'],
    enabled: !!property?.id,
  });

  // Booking states
  const currentMonthNum = new Date().getMonth() + 1;
  const initialMonth = currentMonthNum.toString().padStart(2, '0');
  
  const [startDay, setStartDay] = useState<string>('');
  const [startMonth, setStartMonth] = useState<string>(initialMonth);
  const [endDay, setEndDay] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>(initialMonth);
  const [reserveDays, setReserveDays] = useState<number | ''>('');
  const [hasInterference, setHasInterference] = useState<boolean>(false);

  // Computed values
  const currentYear = new Date().getFullYear();
  const bookingYear = currentMonthNum > 9 ? currentYear + 1 : currentYear;

  const startDate = (startDay && startMonth) ? `${bookingYear}-${startMonth}-${startDay.padStart(2, '0')}` : '';
  const endDate = (endDay && endMonth) ? `${bookingYear}-${endMonth}-${endDay.padStart(2, '0')}` : '';

  const checkInterference = (start: string, end: string) => {
    if (!start || !end) return false;
    for (const r of reservations) {
      if (r.startDate <= end && r.endDate >= start) {
        return true;
      }
    }
    return false;
  };

  const trackContact = () => {
    const idToTrack = property?.id || propertyId;
    if (!idToTrack) return;
    
    // Use keepalive to ensure request completes even if browser navigates away
    fetch('/api/analytics/contact-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: idToTrack }),
      keepalive: true
    }).catch(console.error);
  };

  const handleWhatsAppReserve = () => {
    if (!property) return;

    // Check for interference first
    if (startDate && endDate) {
      if (checkInterference(startDate, endDate)) {
        setHasInterference(true);
        document.getElementById('booking-widget')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    let message = `Bonjour, je souhaite réserver la propriété ${window.location.href}.`;

    if (startDay && endDay) {
      const monthNames: { [key: string]: string } = {
        "05": "Mai", "06": "Juin", "07": "Juillet", "08": "Août", "09": "Septembre"
      };
      const mStart = monthNames[startMonth] || "Juin";
      const mEnd = monthNames[endMonth] || "Juin";
      message += `\nDu ${startDay} ${mStart} au ${endDay} ${mEnd}.`;
      if (reserveDays) message += ` (${reserveDays} nuits)`;
    } else {
      message += `\nJe n'ai pas encore choisi mes dates.`;
    }

    trackContact();
    window.open(`https://wa.me/216${BROKER_PHONE}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleReserveDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const days = e.target.value === '' ? '' : parseInt(e.target.value);
    setReserveDays(days);
    setHasInterference(false);

    if (startDate && days !== '') {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        start.setDate(start.getDate() + days);
        setEndMonth((start.getMonth() + 1).toString().padStart(2, '0'));
        setEndDay(start.getDate().toString());
      }
    }
  };

  // Sync reserveDays when end date is fully entered manually
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          setReserveDays((prev) => prev !== diffDays ? diffDays : prev);
        }
      }
    }
  }, [startDate, endDate]);

  const onReserveClick = () => {
    if (startDate && endDate) {
      const interferes = checkInterference(startDate, endDate);
      if (interferes) {
        setHasInterference(true);
        // Scroll to the booking widget on mobile
        if (lightboxOpen) setLightboxOpen(false);
        document.getElementById('booking-widget')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    setHasInterference(false);
    if (lightboxOpen) setLightboxOpen(false);
    trackContact();
    window.location.href = `tel:${BROKER_PHONE}`;
  };

  const { data: authStatus } = useQuery<{ isAuthenticated: boolean }>({
    queryKey: ['/api/broker/auth-status'],
  });

  const { data: submission } = useQuery<PropertySubmissionWithMedia | null>({
    queryKey: ['/api/broker/submissions', property?.submissionId],
    enabled: !!(authStatus?.isAuthenticated && property?.submissionId),
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/broker/submissions/approved');
      const submissions = await response.json() as PropertySubmissionWithMedia[];
      return submissions.find((s: PropertySubmissionWithMedia) => s.id === property?.submissionId) || null;
    },
  });

  const isAdmin = authStatus?.isAuthenticated;

  const { data: ownerContact } = useQuery<{
    ownerContactVisible: boolean;
    ownerName?: string;
    ownerPhone?: string;
    ownerEmail?: string;
  }>({
    queryKey: ['/api/properties', propertyId, 'owner-contact'],
    queryFn: async () => {
      const response = await fetch(`/api/properties/${propertyId}/owner-contact`);
      return response.json();
    },
    enabled: !!propertyId && !isAdmin,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, file }: { id: string; data: any; file: File | null }) => {
      const formData = new FormData();

      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      if (file) {
        formData.append('neighborhoodMap', file);
      }

      return apiRequest('PUT', `/api/broker/submissions/${id}`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/broker/submissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      toast({
        title: "Propriété mise à jour",
        description: "Les détails de la propriété ont été mis à jour avec succès.",
      });
      setEditDialogOpen(false);
      setNeighborhoodMapFile(null);
      setNeighborhoodMapPreview(null);
    },
    onError: (error: any) => {
      toast({
        title: "Échec de la mise à jour",
        description: error.message || "Échec de la mise à jour de la propriété. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const handleEditProperty = () => {
    if (!submission) return;

    editForm.reset({
      title: submission.title,
      propertyType: submission.propertyType,
      floorLevel: submission.floorLevel || "",
      isFurnished: submission.isFurnished,
      hasLivingRoom: submission.hasLivingRoom,
      hasFridge: submission.hasFridge,
      hasGasStove: submission.hasGasStove,
      hasMicrowave: submission.hasMicrowave ?? false,
      hasWashingMachine: submission.hasWashingMachine ?? false,
      hasAC: submission.hasAC ?? false,
      hasWiFi: submission.hasWiFi ?? false,
      hasParking: submission.hasParking ?? false,
      hasSeaView: submission.hasSeaView ?? false,
      description: submission.description,
      rooms: submission.rooms,
      bathrooms: submission.bathrooms,
      location: submission.location,
      referenceCode: submission.referenceCode ?? "",
      distanceToBeach: submission.distanceToBeach ?? "",
      nearbyPlaces: submission.nearbyPlaces ?? "[]",
      price: submission.price,
      googleMapsUrl: submission.googleMapsUrl || "",
      showOwnerContact: submission.showOwnerContact ?? false,
      showGoogleMaps: submission.showGoogleMaps ?? true,
      showExactLocation: submission.showExactLocation ?? false,
      showNeighborhoodMap: submission.showNeighborhoodMap ?? true,
      showPrice: submission.showPrice ?? true,
      showRooms: submission.showRooms ?? true,
      showBathrooms: submission.showBathrooms ?? true,
      showDescription: submission.showDescription ?? true,
    });
    setNeighborhoodMapFile(null);
    setNeighborhoodMapPreview(submission.neighborhoodMapUrl || null);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!submission) return;

    const formData = editForm.getValues();
    updateMutation.mutate({
      id: submission.id,
      data: formData,
      file: neighborhoodMapFile,
    });
  };

  const handleNeighborhoodMapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNeighborhoodMapFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNeighborhoodMapPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const lightboxNext = () => {
    if (property) setLightboxIndex((prev) => (prev + 1) % property.media.length);
  };

  const lightboxPrev = () => {
    if (property) setLightboxIndex((prev) => (prev - 1 + property.media.length) % property.media.length);
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') lightboxNext();
      if (e.key === 'ArrowLeft') lightboxPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxOpen, property]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
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
          <h2 className="text-2xl font-bold text-foreground mb-4">Propriété non trouvée</h2>
          <Link href="/browse-properties">
            <Button>Parcourir les propriétés</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentMedia = property.media[currentImageIndex] || property.media[0];

  // Pricing & Savings logic
  const price = parseFloat(property.price);
  const hasPromo = property.promoPrice && parseFloat(property.promoPrice) > 0;
  const currentDailyPrice = hasPromo ? parseFloat(property.promoPrice as string) : price;
  
  const hasWeekly = property.pricePerWeek && parseFloat(property.pricePerWeek) > 0;
  const weeklyPriceBase = hasWeekly ? parseFloat(property.pricePerWeek as string) : 0;
  const currentWeeklyPrice = hasPromo && hasWeekly ? Math.ceil(weeklyPriceBase * (currentDailyPrice / price)) : weeklyPriceBase;
  const savingsPerNight = hasWeekly ? Math.floor(currentDailyPrice - (currentWeeklyPrice / 7)) : 0;

  // SEO data
  const primaryImage = property.media.find(m => m.isPrimary) || property.media[0];
  const displayLocation = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(property.location.trim()) ? "Kélibia" : property.location;
  const seoTitle = `${frenchTitle(property.title, property.rooms)} — ${property.rooms} Chambres à ${displayLocation} | Laith Kelibia`;
  const seoDescription = `${property.isFurnished ? 'Logement meublé' : 'Logement'} S+${property.rooms} avec ${property.bathrooms} salles de bain à ${displayLocation}, Kelibia. ${property.distanceToBeach ? `À ${property.distanceToBeach} de la plage. ` : ''}Prix: ${parseFloat(property.price).toLocaleString()} TND/nuit. Réservez sur Laith Kelibia.`;
  const seoKeywords = `location ${displayLocation}, maison s+${property.rooms} kelibia, ${property.title}, ${property.isFurnished ? 'meublé' : 'non meublé'} kelibia, location vacances kelibia, ${parseFloat(property.price).toLocaleString()} TND nuit, dar kelibia, location été cap bon, hébergement kelibia plage`;

  // Structured Data (Schema.org) for Google rich snippets
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    "name": property.title,
    "description": property.description,
    "url": `https://laith-kelibia.tn/maisons/${property.slug || property.id}`,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": displayLocation,
      "addressRegion": "Nabeul",
      "addressCountry": "TN"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 36.8465,
      "longitude": 11.0942
    },
    "numberOfRooms": property.rooms,
    "numberOfBathroomsTotal": property.bathrooms,
    "amenityFeature": [
      ...(property.hasAC ? [{ "@type": "LocationFeatureSpecification", "name": "Climatisation", "value": true }] : []),
      ...(property.hasWiFi ? [{ "@type": "LocationFeatureSpecification", "name": "WiFi", "value": true }] : []),
      ...(property.hasParking ? [{ "@type": "LocationFeatureSpecification", "name": "Parking", "value": true }] : []),
      ...(property.hasSeaView ? [{ "@type": "LocationFeatureSpecification", "name": "Vue mer", "value": true }] : []),
      ...(property.isFurnished ? [{ "@type": "LocationFeatureSpecification", "name": "Meublé", "value": true }] : []),
    ],
    "image": property.media
      .filter((m: any) => m.mimeType?.startsWith('image/'))
      .slice(0, 5)
      .map((m: any) => `https://laith-kelibia.tn${m.url}`),
    "offers": {
      "@type": "Offer",
      "price": parseFloat(property.price),
      "priceCurrency": "TND",
      "availability": "https://schema.org/InStock",
      "priceValidUntil": new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
    },
    "provider": {
      "@type": "RealEstateAgent",
      "name": "Laith Kelibia",
      "url": "https://laith-kelibia.tn",
      "telephone": "+21650344187"
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background pb-20 md:pb-12">
      <SEO
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        image={primaryImage?.url}
        url={`https://laith-kelibia.tn/maisons/${property.slug || property.id}`}
        type="article"
      />

      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-3 pb-32 lg:pb-10">

        {/* Back Navigation */}
        <div className="mb-2 animate-fade-in">
          <button 
            onClick={() => window.history.length > 1 ? window.history.back() : window.location.href = '/'}
            className="inline-flex items-center gap-1.5 text-primary hover:opacity-70 transition-all py-2 group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm sm:text-base font-bold tracking-tight">Accueil</span>
          </button>
        </div>

        {/* Title & Location at the top (Airbnb style) */}
        <div className="mb-3 animate-fade-in-up">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 leading-tight">
            {frenchTitle(property.title, property.rooms)}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm sm:text-base">
            {property.distanceToBeach && (
              <span className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                <Waves className="w-4 h-4" />
                Distance à la plage sur pieds = {property.distanceToBeach} !
              </span>
            )}
            {isAdmin && !property.showExactLocation && (
              <Badge variant="secondary" className="text-[10px] ml-2">Admin seulement</Badge>
            )}
            {property.referenceCode && (
              <Badge variant="outline" className="text-[10px] ml-2 font-mono text-primary border-primary">REF: {property.referenceCode}</Badge>
            )}
          </div>
        </div>

        {/* Image Gallery — Horizontal Slider + Fullscreen Lightbox */}
        <div className="mb-4 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          {property.media.length > 0 ? (
            <>
              {/* Desktop: Main image + 2x2 grid blocks, horizontally scrollable */}
              <div
                className="hidden md:flex gap-2 rounded-xl overflow-x-auto pb-2"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--primary)) transparent' }}
              >
                {/* Main image — large */}
                <div
                  className="relative flex-shrink-0 cursor-pointer group overflow-hidden rounded-xl w-[50%] h-[420px]"
                  onClick={() => property.media[0].mimeType.startsWith('image/') && openLightbox(0)}
                >
                  {property.media[0].mimeType.startsWith('image/') ? (
                    <img
                      src={property.media[0].url}
                      alt={frenchTitle(property.title, property.rooms)}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <video
                      src={property.media[0].url}
                      className="w-full h-full object-cover"
                      controls
                      playsInline
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  {property.media[0].mimeType.startsWith('image/') && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                  )}
                </div>

                {/* 2x2 grid blocks of remaining images */}
                {(() => {
                  const rest = property.media.slice(1);
                  const blocks: typeof rest[] = [];
                  for (let i = 0; i < rest.length; i += 4) {
                    blocks.push(rest.slice(i, i + 4));
                  }
                  return blocks.map((block, blockIdx) => (
                    <div
                      key={`block-${blockIdx}`}
                      className="flex-shrink-0 grid grid-cols-2 grid-rows-2 gap-2 w-[50%] h-[420px]"
                    >
                      {block.map((media, idx) => {
                        const globalIdx = 1 + blockIdx * 4 + idx;
                        return (
                          <div
                            key={media.id}
                            className="relative cursor-pointer group overflow-hidden rounded-xl"
                            onClick={() => media.mimeType.startsWith('image/') && openLightbox(globalIdx)}
                          >
                            {media.mimeType.startsWith('image/') ? (
                              <img
                                src={media.url}
                                alt={`Photo ${globalIdx + 1}`}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                              />
                            ) : (
                              <video
                                src={media.url}
                                className="w-full h-full object-cover"
                                controls
                                playsInline
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                            {media.mimeType.startsWith('image/') && (
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>

              {/* Mobile Gallery: Main Viewer + Thumbnails */}
              <div className="md:hidden flex flex-col gap-2">
                {/* Main Viewer */}
                <div
                  className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  onClick={() => currentMedia.mimeType.startsWith('image/') && openLightbox(currentImageIndex)}
                >
                  {currentMedia.mimeType.startsWith('image/') ? (
                    <img
                      key={currentImageIndex}
                      src={currentMedia.url}
                      alt={frenchTitle(property.title, property.rooms)}
                      className="w-full h-full object-cover animate-fade-in"
                    />
                  ) : (
                    <video
                      key={currentImageIndex}
                      src={currentMedia.url}
                      controls
                      playsInline
                      className="w-full h-full object-contain bg-black"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}

                  {property.media.length > 1 && (
                    <>
                      {/* Left arrow */}
                      <div className="absolute inset-y-0 left-0 flex items-center pl-2 z-30">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="w-10 h-10 rounded-full bg-white/90 shadow-lg border-0 active:scale-90 transition-transform"
                          onClick={(e) => { e.stopPropagation(); prevImage(); }}
                        >
                          <ChevronLeft className="h-5 w-5 text-foreground" />
                        </Button>
                      </div>

                      {/* Right arrow */}
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 z-30">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="w-10 h-10 rounded-full bg-white/90 shadow-lg border-0 active:scale-90 transition-transform"
                          onClick={(e) => { e.stopPropagation(); nextImage(); }}
                        >
                          <ChevronRight className="h-5 w-5 text-foreground" />
                        </Button>
                      </div>

                      {/* Counter */}
                      <div className="absolute bottom-3 right-3 bg-black/65 text-white text-[11px] font-bold px-2.5 py-1 rounded-full z-30">
                        {currentImageIndex + 1} / {property.media.length}
                      </div>
                    </>
                  )}
                </div>

                {/* Thumbnail Strip */}
                {property.media.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1 pb-1 px-0.5">
                    {property.media.map((media, idx) => {
                      const isActive = idx === currentImageIndex;
                      const isVideo = media.mimeType.startsWith('video/');
                      return (
                        <button
                          key={media.id}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`relative flex-shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden transition-all active:scale-95 ${isActive
                            ? 'ring-2 ring-primary ring-offset-1 opacity-100'
                            : 'opacity-55 hover:opacity-80'
                            }`}
                        >
                          {isVideo ? (
                            media.thumbnailUrl ? (
                              <img
                                src={media.thumbnailUrl}
                                alt={`Vidéo ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[6px] border-y-transparent ml-1" />
                              </div>
                            )
                          ) : (
                            <img
                              src={media.url}
                              alt={`Photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          )}
                          {isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
                                <div className="w-0 h-0 border-l-[7px] border-l-white border-y-[5px] border-y-transparent ml-0.5" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="aspect-[4/3] md:h-[50vh] rounded-xl bg-muted flex flex-col items-center justify-center">
              <MapPin className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground font-medium">Aucune photo disponible</p>
            </div>
          )}
        </div>

        {/* Fullscreen Lightbox */}
        {lightboxOpen && property.media.length > 0 && (
          <div 
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-fade-in"
            onClick={() => setLightboxOpen(false)}
          >
            {/* Close button */}
            <button 
              className="absolute top-4 right-4 z-[110] w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 backdrop-blur-md flex items-center justify-center transition-colors text-white shadow-lg"
              onClick={() => setLightboxOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>

            {/* Counter */}
            <div className="absolute top-4 left-4 z-[110] text-white font-medium bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-sm shadow-lg">
              {lightboxIndex + 1} / {property.media.length}
            </div>

            {/* Left arrow */}
            {property.media.length > 1 && (
              <button
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-[110] w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 backdrop-blur-md flex items-center justify-center transition-all text-white active:scale-90 shadow-lg"
                onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
            )}

            {/* Right arrow */}
            {property.media.length > 1 && (
              <button
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-[110] w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 backdrop-blur-md flex items-center justify-center transition-all text-white active:scale-90 shadow-lg"
                onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            )}

            {/* Image */}
            <div 
              className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {property.media[lightboxIndex].mimeType.startsWith('image/') ? (
                <img
                  key={lightboxIndex}
                  src={property.media[lightboxIndex].url}
                  alt={`Photo ${lightboxIndex + 1}`}
                  className="max-w-full max-h-[85vh] object-contain rounded-lg animate-fade-in select-none"
                  draggable={false}
                />
              ) : (
                <video
                  key={lightboxIndex}
                  src={property.media[lightboxIndex].url}
                  controls
                  autoPlay
                  playsInline
                  className="max-w-full max-h-[85vh] object-contain rounded-lg"
                />
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>

            {/* Quick Summary Row */}
            <div className="flex flex-wrap items-center justify-start gap-4 pb-2 border-b border-border" dir="rtl">
              <div className="flex items-center gap-2">
                <Sofa className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">صالة</span>
              </div>
              <span className="text-muted-foreground/30 hidden sm:inline">•</span>
              {(isAdmin || property.showRooms) && (
                <>
                  <div className="flex items-center gap-2">
                    <BedDouble className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">بيوت = {property.rooms}</span>
                  </div>
                  <span className="text-muted-foreground/30 hidden sm:inline">•</span>
                </>
              )}
              {(isAdmin || property.showBathrooms) && (
                <>
                  <div className="flex items-center gap-2">
                    <Bath className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">{property.bathrooms > 1 ? `حمامات = ${property.bathrooms}` : 'حمام'}</span>
                  </div>
                  <span className="text-muted-foreground/30 hidden sm:inline">•</span>
                </>
              )}
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">مطبخ</span>
              </div>
            </div>

            {/* Bed Details - Per-Room Card Layout */}
            {(property.numDoubleBeds > 0 || property.numSingleBeds > 0 || property.hasSofaBed || property.bedDetails) && (
              <div className="pb-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="rtl">
                  {property.bedDetails && property.bedDetails.startsWith('[') ? (
                    <>
                      {(() => {
                        try {
                          return JSON.parse(property.bedDetails).map((room: any, i: number) => {
                            if (room.double === 0 && room.single === 0) return null;
                            return (
                              <div key={`room-${i}`} className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-background shadow-sm">
                                <span className="text-2xl leading-none">🛏️</span>
                                <div>
                                  <span className="text-sm font-semibold text-foreground block">
                                    الغرفة {i + 1}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {[
                                      room.double > 0 ? `فرش دوبل = ${room.double}` : null,
                                      room.single > 0 ? `فرش مفرد = ${room.single}` : null
                                    ].filter(Boolean).join("، ")}
                                  </span>
                                </div>
                              </div>
                            );
                          });
                        } catch(e) {
                          return null;
                        }
                      })()}
                      
                    </>
                  ) : (
                    <>
                      {/* Bedroom cards — one per bedroom with double beds */}
                      {Array.from({ length: property.numDoubleBeds || 0 }).map((_, i) => (
                        <div key={`double-${i}`} className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-background shadow-sm">
                          <span className="text-2xl leading-none">🛏️</span>
                          <div>
                            <span className="text-sm font-semibold text-foreground block">
                              الغرفة {i + 1}
                            </span>
                            <span className="text-sm text-muted-foreground">فرش دوبل = 1</span>
                          </div>
                        </div>
                      ))}

                      {/* Single-bed rooms — grouped after double-bed rooms */}
                      {property.numSingleBeds > 0 && (
                        <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-background shadow-sm">
                          <span className="text-2xl leading-none">🛏️</span>
                          <div>
                            <span className="text-sm font-semibold text-foreground block">
                              الغرفة {(property.numDoubleBeds || 0) + 1}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              فرش مفرد = {property.numSingleBeds}
                            </span>
                          </div>
                        </div>
                      )}



                      {/* Fallback: show bedDetails text if no structured counts */}
                      {!property.numDoubleBeds && !property.numSingleBeds && !property.hasSofaBed && property.bedDetails && (
                        <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-background shadow-sm col-span-full">
                          <span className="text-2xl leading-none">🛏️</span>
                          <div>
                            <span className="text-sm font-semibold text-foreground block"></span>
                            <span className="text-sm text-muted-foreground">{property.bedDetails}</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}



            {/* Amenities Grid (Ce que propose ce logement) - Moved up */}
            <div className="py-6 border-b border-border">
              <h2 className="text-xl font-semibold mb-6 text-foreground text-center">شنوّة تلقى في الدار</h2>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 justify-items-center">
                {property.hasWiFi && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <Wifi className="w-6 h-6 opacity-70" />
                    <span className="font-medium">Wi-Fi</span>
                  </div>
                )}
                {property.hasAC && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <Wind className="w-6 h-6 opacity-70" />
                    <span className="font-medium">تكييف</span>
                  </div>
                )}
                {property.hasParking && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <Car className="w-6 h-6 opacity-70" />
                    <span className="font-medium">باركينج</span>
                  </div>
                )}
                {property.hasSeaView && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <Waves className="w-6 h-6 opacity-70" />
                    <span className="font-medium">إطلالة على البحر</span>
                  </div>
                )}
                {property.hasFridge && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <Refrigerator className="w-6 h-6 opacity-70" />
                    <span className="font-medium">فريجيدار</span>
                  </div>
                )}
                {property.hasGasStove && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <Flame className="w-6 h-6 opacity-70" />
                    <span className="font-medium">غاز</span>
                  </div>
                )}
                {property.hasKitchenUtensils && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <Utensils className="w-6 h-6 opacity-70" />
                    <span className="font-medium">ماعون كوجينة</span>
                  </div>
                )}
                {property.hasMicrowave && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <Microwave className="w-6 h-6 opacity-70" />
                    <span className="font-medium">ميكروويف</span>
                  </div>
                )}
                {property.hasWashingMachine && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <WashingMachine className="w-6 h-6 opacity-70" />
                    <span className="font-medium">آلة غسيل</span>
                  </div>
                )}
                {property.hasLinens && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <NotebookText className="w-6 h-6 opacity-70" />
                    <span className="font-medium">دراوات</span>
                  </div>
                )}
                {property.hasTowels && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <NotebookText className="w-6 h-6 opacity-70" />
                    <span className="font-medium">مناشف</span>
                  </div>
                )}
                {property.tvType && property.tvType !== "None" && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <Tv className="w-6 h-6 opacity-70" />
                    <span className="font-medium">
                      {property.tvType === "Smart TV" ? "تلفزة سمارت (Netflix/YT)" : "تلفزة"}
                    </span>
                  </div>
                )}
              </div>

            </div>

            {/* Services à proximité — standalone section below amenities */}
            {property.nearbyCommodities && (
              <div className="py-6 border-b border-border">
                <h2 className="text-xl font-semibold mb-4 text-foreground text-center">الخدمات القريبة</h2>
                <div className="flex flex-wrap justify-center gap-2">
                  {property.nearbyCommodities.split(", ").filter(Boolean).map((rawTag, idx) => {
                    let tag = rawTag.trim();
                    const lower = tag.toLowerCase();
                    
                    const tagTranslations: Record<string, string> = {
                      "plage": "بحر",
                      "restaurant": "مطعم",
                      "café": "قهوة",
                      "cafe": "قهوة",
                      "boulangerie": "كوشة",
                      "pharmacie": "فرمسي",
                      "épicerie": "عطار",
                      "epicerie": "عطار",
                      "transport": "نقل",
                      "banque": "بانكة",
                      "marché": "مرشي",
                      "marche": "مرشي",
                      "hôpital": "سبيطار",
                      "hopital": "سبيطار"
                    };
                    
                    for (const [fr, ar] of Object.entries(tagTranslations)) {
                      if (lower.includes(fr)) {
                        tag = tag.replace(new RegExp(fr, "ig"), ar);
                      }
                    }

                    if (lower.includes("transport")) {
                      tag = `🚕 ${tag.replace("🚌", "").trim()}`;
                    } else if (lower.includes("restaurant") && !tag.includes("🍽️")) {
                      tag = `🍽️ ${tag}`;
                    } else if ((lower.includes("café") || lower.includes("caffé") || lower.includes("cafe")) && !tag.includes("☕")) {
                      tag = `☕ ${tag}`;
                    }

                    return (
                      <span
                        key={idx}
                        className="text-sm font-medium px-3 py-1.5 bg-background rounded-full border border-slate-200 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                      >
                        {tag}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            {(isAdmin || property.showDescription) && (
              <div className="pb-6">
                <h2 className="text-xl font-semibold mb-4 text-foreground flex justify-center items-center gap-2">
                  الوصف
                  {isAdmin && !property.showDescription && (
                    <Badge variant="secondary" className="text-[10px]">Admin</Badge>
                  )}
                </h2>
                <div className="text-foreground/90 whitespace-pre-line leading-relaxed mb-8 text-right" dir="rtl">
                  {property.description}
                </div>
              </div>
            )}

            {/* Rules & Terms (New) - Moved before Map */}
            <div className="py-6 border-t border-border flex flex-col items-center">
              <h2 className="text-xl font-semibold mb-6 text-foreground text-center">وقت الدخول والخروج</h2>
              
              <div className="flex flex-col items-center gap-2 mb-6">
                <Clock className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="font-bold text-lg text-foreground text-center">
                  الدخول: {property.checkInTime || "13:00"} &bull; الخروج: {property.checkOutTime || "11:00"}
                </span>
              </div>

              {property.houseRules && (
                <div className="text-center max-w-lg mb-6" dir="rtl">
                  <span className="text-sm text-muted-foreground block mb-2">قواعد الدار</span>
                  <span className="font-medium text-foreground">{property.houseRules}</span>
                </div>
              )}

              {/* Cancellation Policy */}
              {property.cancellationPolicy && (
                <div className="bg-muted/30 p-5 rounded-2xl border border-border/50 text-center max-w-lg" dir="rtl">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">شروط الإلغاء</h3>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed italic">
                    "{property.cancellationPolicy}"
                  </p>
                </div>
              )}
            </div>

            {/* Google Maps Embed Location - Moved right under rules */}
            {property.location && (
              <div className="pt-6 border-t border-border">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-4">
                  <h3 className="text-lg font-semibold text-foreground text-center">البلاصة</h3>
                  {property.distanceToBeach && (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                      <Waves className="w-3 h-3 mr-1" />
                      {property.distanceToBeach}
                    </Badge>
                  )}
                  {property.locationRepere && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 ml-2">
                      <MapPin className="w-3 h-3 mr-1" />
                      {property.locationRepere}
                    </Badge>
                  )}
                  {property.isQuietNeighborhood && (
                    <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200 ml-2">
                      <span className="mr-1">🤫</span>
                      حومة هادية
                    </Badge>
                  )}
                </div>
                <div className="relative w-full h-64 md:h-[350px] rounded-xl overflow-hidden border border-border shadow-sm mb-4">
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(property.location.trim()) 
                        ? property.location.trim() 
                        : (property.location.toLowerCase().includes('tunisi') ? property.location : property.location + ', Tunisia')
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-sm text-primary font-bold px-4 py-2 rounded-xl shadow-md hover:scale-105 transition-all flex items-center gap-2 border border-primary/20 hover:bg-primary hover:text-white group"
                  >
                    <MapPin className="w-4 h-4 text-primary group-hover:text-white transition-colors" />
                    شوف في جوجل مابس
                  </a>
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(
                      /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(property.location.trim()) 
                        ? property.location.trim() 
                        : (property.location.toLowerCase().includes('tunisi') ? property.location : property.location + ', Tunisia')
                    )}&z=15&output=embed`}
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Booking / Contact Card (Sticky) */}
          <div className="lg:col-span-1 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <Card className="sticky top-24 shadow-2xl border-border/40 overflow-hidden rounded-2xl">
              <CardContent className="p-0">

                {/* Price Header */}
                {(isAdmin || property.showPrice) && (
                  <div className="px-5 pt-5 pb-3 border-b border-border/40">
                    <div className="flex flex-col mb-1">
                      {property.promoPrice && parseFloat(property.promoPrice) > 0 ? (
                        <>
                          <div className="flex items-center gap-2 mb-[-4px]">
                            <span className="text-sm font-bold text-red-500/60 line-through decoration-red-500/40">
                              {parseFloat(property.price).toLocaleString()} TND
                            </span>
                            <span className="bg-red-100 text-red-600 text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm">
                              -{Math.round((1 - parseFloat(property.promoPrice) / parseFloat(property.price)) * 100)}%
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-black text-[#FF4500] tracking-tight animate-pulse-subtle shadow-orange-500/20 drop-shadow-sm">
                              {parseFloat(property.promoPrice).toLocaleString()}
                            </span>
                            <span className="text-base font-bold text-[#FF4500]/80">د</span>
                            <span className="text-xs text-muted-foreground font-medium ml-1">/ الليلة</span>
                            {isAdmin && !property.showPrice && (
                              <Badge variant="secondary" className="text-[10px] ml-2">Admin</Badge>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-black text-foreground tracking-tight">
                            {parseFloat(property.price).toLocaleString()}
                          </span>
                          <span className="text-base font-bold text-foreground">د</span>
                          <span className="text-xs text-muted-foreground font-medium ml-1">/ الليلة</span>
                          {isAdmin && !property.showPrice && (
                            <Badge variant="secondary" className="text-[10px] ml-2">Admin</Badge>
                          )}
                        </div>
                      )}
                    </div>
                    {hasWeekly && (
                      <div className="flex flex-col mt-3 gap-0.5">
                        {hasPromo ? (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-red-500/60 line-through decoration-red-500/40">
                                {weeklyPriceBase.toLocaleString()} د
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-2xl font-black text-[#FF4500] tracking-tight">
                                {currentWeeklyPrice.toLocaleString()}
                              </span>
                              <span className="text-base font-bold text-[#FF4500]/90 ml-1.5">د</span>
                              <span className="text-xs font-bold text-[#FF4500]/80 ml-1">/ الأسبوع</span>
                              {savingsPerNight > 0 && (
                                <span className="text-[11px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-sm border border-orange-200 shadow-sm">
                                  💰 Éco {savingsPerNight} TND/nuit
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-2xl font-black text-emerald-600 tracking-tight">
                              {currentWeeklyPrice.toLocaleString()}
                            </span>
                            <span className="text-base font-bold text-emerald-600 ml-1.5">د</span>
                            <span className="text-xs font-bold text-emerald-600 ml-1">/ الأسبوع</span>
                            {savingsPerNight > 0 && (
                              <span className="text-[11px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-sm border border-emerald-200">
                                💰 Éco {savingsPerNight} TND/nuit
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Booking Widget */}
                <div id="booking-widget" className="px-4 py-4 space-y-2.5">
                  <Button
                    className="w-full py-4 text-sm font-black rounded-xl shadow-lg shadow-rose-500/20 transition-all active:scale-[0.98] bg-gradient-to-r from-[#FF385C] to-[#E31C5F] hover:from-[#E0314F] hover:to-[#C8185A] text-white border-0"
                    onClick={onReserveClick}
                  >
                    Réserver 
                  </Button>
                </div>

                {/* Phone */}
                {!hasInterference && (
                  <div className="px-5 pb-4 pt-3 border-t border-border/40 flex items-center gap-3 justify-center">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Téléphone</div>
                      <a
                        href={`tel:${BROKER_PHONE}`}
                        className="text-base font-bold text-foreground hover:text-primary transition-colors"
                      >
                        {BROKER_PHONE_DISPLAY}
                      </a>
                    </div>
                  </div>
                )}

                {/* Admin-Only: Owner Contact Info */}
                {isAdmin && submission && (submission.ownerName || submission.ownerPhone || submission.ownerEmail) && (
                  <div className="px-5 pb-4 pt-3 border-t border-border/40">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-bold text-foreground">مولى الدار</span>
                        <Badge variant="secondary" className="text-[9px] ml-auto bg-amber-100 text-amber-700 border-amber-200">Admin seulement</Badge>
                      </div>
                      {submission.ownerName && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <User className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground">{submission.ownerName}</span>
                        </div>
                      )}
                      {submission.ownerPhone && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                          <a
                            href={`tel:${submission.ownerPhone}`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {submission.ownerPhone}
                          </a>
                        </div>
                      )}
                      {submission.ownerEmail && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                          <a
                            href={`mailto:${submission.ownerEmail}`}
                            className="font-medium text-foreground hover:text-primary transition-colors truncate"
                          >
                            {submission.ownerEmail}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Admin Modify Button */}
                {isAdmin && submission && (
                  <div className="px-5 pb-5 pt-0">
                    <Button
                      variant="outline"
                      className="w-full bg-blue-50/50 hover:bg-blue-100 text-blue-700 border-blue-200"
                      onClick={handleEditProperty}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Modifier l'annonce
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Property Dialog (Admin) */}
      {isAdmin && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier la Propriété</DialogTitle>
              <DialogDescription>
                Mettre à jour les informations de cette annonce.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Titre</Label>
                <Input
                  id="edit-title"
                  {...editForm.register("title")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  {...editForm.register("description")}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-location">Emplacement exact</Label>
                <Input
                  id="edit-location"
                  {...editForm.register("location")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-distance-beach">Distance à la plage sur pieds</Label>
                <select
                  id="edit-distance-beach"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...editForm.register("distanceToBeach")}
                >
                  <option value="">Choisir une distance</option>
                  <option value="0 minutes (sur la plage)">0 minutes (sur la plage)</option>
                  <option value="1 minute">1 minute</option>
                  <option value="2 minutes">2 minutes</option>
                  <option value="3 minutes">3 minutes</option>
                  <option value="4 minutes">4 minutes</option>
                  <option value="5 minutes">5 minutes</option>
                  <option value="6 minutes">6 minutes</option>
                  <option value="7 minutes">7 minutes</option>
                  <option value="8 minutes">8 minutes</option>
                  <option value="9 minutes">9 minutes</option>
                  <option value="10 minutes">10 minutes</option>
                  <option value="11 minutes">11 minutes</option>
                  <option value="12 minutes">12 minutes</option>
                  <option value="13 minutes">13 minutes</option>
                  <option value="14 minutes">14 minutes</option>
                  <option value="15 minutes">15 minutes</option>
                  <option value="16 minutes">16 minutes</option>
                  <option value="17 minutes">17 minutes</option>
                  <option value="18 minutes">18 minutes</option>
                  <option value="19 minutes">19 minutes</option>
                  <option value="20 minutes">20 minutes</option>
                  <option value="21 minutes">21 minutes</option>
                  <option value="22 minutes">22 minutes</option>
                  <option value="23 minutes">23 minutes</option>
                  <option value="24 minutes">24 minutes</option>
                  <option value="25 minutes">25 minutes</option>
                  <option value="26 minutes">26 minutes</option>
                  <option value="27 minutes">27 minutes</option>
                  <option value="28 minutes">28 minutes</option>
                  <option value="29 minutes">29 minutes</option>
                  <option value="30 minutes">30 minutes</option>
                </select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-rooms">Chambres</Label>
                  <Input
                    id="edit-rooms"
                    type="number"
                    {...editForm.register("rooms", { valueAsNumber: true })}
                    min={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-bathrooms">Salles de bain</Label>
                  <Input
                    id="edit-bathrooms"
                    type="number"
                    {...editForm.register("bathrooms", { valueAsNumber: true })}
                    min={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-price">Prix par nuit (TND)</Label>
                  <Input
                    id="edit-price"
                    {...editForm.register("price")}
                  />
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-semibold text-sm">Équipements</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="edit-ac" checked={editForm.watch("hasAC")} onCheckedChange={(c) => editForm.setValue("hasAC", !!c)} />
                    <Label htmlFor="edit-ac" className="cursor-pointer">Climatisation</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="edit-wifi" checked={editForm.watch("hasWiFi")} onCheckedChange={(c) => editForm.setValue("hasWiFi", !!c)} />
                    <Label htmlFor="edit-wifi" className="cursor-pointer">Wi-Fi</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="edit-parking" checked={editForm.watch("hasParking")} onCheckedChange={(c) => editForm.setValue("hasParking", !!c)} />
                    <Label htmlFor="edit-parking" className="cursor-pointer">Parking gratuit</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="edit-sea-view" checked={editForm.watch("hasSeaView")} onCheckedChange={(c) => editForm.setValue("hasSeaView", !!c)} />
                    <Label htmlFor="edit-sea-view" className="cursor-pointer">Vue sur mer</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="edit-fridge" checked={editForm.watch("hasFridge")} onCheckedChange={(c) => editForm.setValue("hasFridge", !!c)} />
                    <Label htmlFor="edit-fridge" className="cursor-pointer">Réfrigérateur</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="edit-microwave" checked={editForm.watch("hasMicrowave")} onCheckedChange={(c) => editForm.setValue("hasMicrowave", !!c)} />
                    <Label htmlFor="edit-microwave" className="cursor-pointer">Micro-ondes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="edit-washing" checked={editForm.watch("hasWashingMachine")} onCheckedChange={(c) => editForm.setValue("hasWashingMachine", !!c)} />
                    <Label htmlFor="edit-washing" className="cursor-pointer">Machine à laver</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="edit-stove" checked={editForm.watch("hasGasStove")} onCheckedChange={(c) => editForm.setValue("hasGasStove", !!c)} />
                    <Label htmlFor="edit-stove" className="cursor-pointer">Gaz de ville/Cuisinière</Label>
                  </div>
                </div>
              </div>

              {/* Visibility Controls */}
              <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-300">Paramètres de visibilité</h4>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-show-exact-location"
                      checked={editForm.watch("showExactLocation")}
                      onCheckedChange={(checked) => editForm.setValue("showExactLocation", !!checked)}
                    />
                    <Label htmlFor="edit-show-exact-location" className="cursor-pointer text-sm">
                      Afficher l'emplacement exact aux visiteurs
                    </Label>
                  </div>
                </div>
              </div>

            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={updateMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Mobile Floating Booking Bar - Balanced & Refined */}
      <div className={`lg:hidden fixed bottom-0 left-0 right-0 ${lightboxOpen ? 'bg-black/80 border-white/10' : 'bg-background/98 border-border/40'} backdrop-blur-lg border-t p-4 pb-6 flex flex-col gap-3 z-[100] shadow-[0_-12px_40px_-10px_rgba(0,0,0,0.2)] animate-slide-up`}>

        {/* Row 1: Price and Date Selection (Expanded) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col flex-shrink-0">
            {property.promoPrice && parseFloat(property.promoPrice) > 0 ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-[-2px]">
                  <span className={`text-[10px] font-bold ${lightboxOpen ? 'text-red-400/60' : 'text-red-500/60'} line-through decoration-red-500/40`}>
                    {parseFloat(property.price).toLocaleString()} د
                  </span>
                  <span className={`text-[9px] font-black px-1 rounded ${lightboxOpen ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
                    -{Math.round((1 - parseFloat(property.promoPrice) / parseFloat(property.price)) * 100)}%
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-xl font-black tracking-tighter ${lightboxOpen ? 'text-[#FF8C00]' : 'text-[#FF4500]'}`}>
                    {parseFloat(property.promoPrice).toLocaleString()}
                  </span>
                  <span className={`text-sm font-bold ml-1.5 ${lightboxOpen ? 'text-[#FF8C00]/90' : 'text-[#FF4500]/90'}`}>د</span>
                  <span className={`text-[10px] font-bold uppercase ml-1 ${lightboxOpen ? 'text-[#FF8C00]/70' : 'text-muted-foreground'}`}>/ الليلة</span>
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className={`text-xl font-black tracking-tighter ${lightboxOpen ? 'text-white' : 'text-foreground'}`}>
                  {parseFloat(property.price).toLocaleString()}
                </span>
                <span className={`text-sm font-bold ml-1.5 ${lightboxOpen ? 'text-white/90' : 'text-foreground'}`}>د</span>
                <span className={`text-[10px] font-bold uppercase ml-1 ${lightboxOpen ? 'text-white/70' : 'text-muted-foreground'}`}>/ الليلة</span>
              </div>
            )}
            {hasWeekly && (
              <div className="flex flex-col mt-0.5">
                {hasPromo ? (
                  <>
                    <div className="flex items-center gap-1.5 mb-[-2px]">
                      <span className={`text-[10px] font-bold line-through ${lightboxOpen ? 'text-red-400/60 decoration-red-400/40' : 'text-red-500/60 decoration-red-500/40'}`}>
                        {weeklyPriceBase.toLocaleString()} د
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`text-sm font-black tracking-tighter ${lightboxOpen ? 'text-[#FF8C00]' : 'text-[#FF4500]'}`}>
                        {currentWeeklyPrice.toLocaleString()}
                      </span>
                      <span className={`text-sm font-bold ml-1.5 ${lightboxOpen ? 'text-[#FF8C00]/90' : 'text-[#FF4500]/90'}`}>د</span>
                      <span className={`text-[10px] font-bold uppercase ml-1 ${lightboxOpen ? 'text-[#FF8C00]/80' : 'text-[#FF4500]/80'}`}>/ الأسبوع</span>
                      {savingsPerNight > 0 && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm shadow-sm ${lightboxOpen ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                          🔥 Éco {savingsPerNight} TND/nuit
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className={`text-sm font-black tracking-tighter ${lightboxOpen ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {currentWeeklyPrice.toLocaleString()}
                    </span>
                    <span className={`text-sm font-bold ml-1.5 ${lightboxOpen ? 'text-emerald-400' : 'text-emerald-600'}`}>د</span>
                    <span className={`text-[10px] font-bold uppercase ml-1 ${lightboxOpen ? 'text-emerald-400/80' : 'text-emerald-500'}`}>/ الأسبوع</span>
                    {savingsPerNight > 0 && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm border ${lightboxOpen ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                        💰 Éco {savingsPerNight} TND/nuit
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Button
          className="w-full bg-gradient-to-r from-[#FF385C] to-[#D80765] hover:opacity-95 text-white py-3 h-auto rounded-2xl shadow-lg transition-all active:scale-[0.98] border-0 flex flex-col items-center justify-center gap-0.5"
          onClick={onReserveClick}
        >
          <span className="font-black text-[17px]">Réserver</span>
          <div className="flex items-center gap-1.5 opacity-90">
            <Phone className="w-3 h-3" />
            <span className="text-[11px] font-bold tracking-wider">{BROKER_PHONE_DISPLAY}</span>
          </div>
        </Button>
      </div>

    </div>
    </>
  );
}
