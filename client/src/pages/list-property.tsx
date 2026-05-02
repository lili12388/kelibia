import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Image as ImageIcon, Video } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertPropertySubmissionSchema, type InsertPropertySubmission } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/navbar";

export default function ListPropertyPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Upload statistics
  const [uploadStats, setUploadStats] = useState({
    uploadedBytes: 0,
    totalBytes: 0,
    uploadSpeed: 0,
    estimatedTimeRemaining: 0,
    startTime: 0
  });

  // Upload cancellation
  const [uploadAbortController, setUploadAbortController] = useState<AbortController | null>(null);

  // Helper functions for formatting
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    if (seconds === 0 || !isFinite(seconds)) return '--';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Cancel upload function
  const cancelUpload = () => {
    if (uploadAbortController) {
      uploadAbortController.abort();
      setUploadAbortController(null);
    }
    
    // Reset upload state but keep form data
    setIsUploading(false);
    setUploadProgress(0);
    setUploadStats({
      uploadedBytes: 0,
      totalBytes: 0,
      uploadSpeed: 0,
      estimatedTimeRemaining: 0,
      startTime: 0
    });
    
    toast({
      title: "Upload Cancelled",
      description: "Your upload has been cancelled. Your form data is preserved.",
    });
  };
  
  // Check if user is admin and if they're on admin route
  const { data: authStatus } = useQuery<{ isAuthenticated: boolean }>({
    queryKey: ['/api/broker/auth-status'],
  });
  
  const isAdmin = authStatus?.isAuthenticated;
  const isAdminRoute = location.startsWith('/admin');

  const form = useForm<InsertPropertySubmission>({
    resolver: zodResolver(insertPropertySubmissionSchema),
    defaultValues: {
      title: "", // Will be auto-generated
      propertyType: "Apartment",
      floorLevel: "",
      isFurnished: false,
      hasLivingRoom: false,
      hasFridge: false,
      hasGasStove: false,
      hasAC: false,
      hasWiFi: false,
      hasParking: false,
      hasSeaView: false,
      description: "",
      rooms: 1,
      bathrooms: 1,
      maxGuests: 1,
      location: "",
      referenceCode: "",
      distanceToBeach: "",
      nearbyPlaces: "[]",
      price: "",
      ownerName: "",
      ownerEmail: "",
      ownerPhone: "",
      status: "pending",
      googleMapsUrl: "",
      neighborhoodMapUrl: null,
    },
  });

  const submitPropertyMutation = useMutation({
    mutationFn: async (data: InsertPropertySubmission & { files: File[]; isAdmin?: boolean }) => {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simulate progress for compression phase
      setUploadProgress(10);
      
      // Compress images on client side to reduce payload size
      const compressedFiles = await Promise.all(
        files.map(async (file) => {
          if (!file.type.startsWith('image/')) {
            return file; // Keep non-images as-is
          }

          return new Promise<File>((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => {
              img.src = e.target?.result as string;

              img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d')!;

                // Compress to max 1280x720 and 70% quality
                const MAX_WIDTH = 1280;
                const MAX_HEIGHT = 720;

                let width = img.width;
                let height = img.height;

                if (width > height) {
                  if (width > MAX_WIDTH) {
                    height = (height * MAX_WIDTH) / width;
                    width = MAX_WIDTH;
                  }
                } else {
                  if (height > MAX_HEIGHT) {
                    width = (width * MAX_HEIGHT) / height;
                    height = MAX_HEIGHT;
                  }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                  (blob) => {
                    if (blob) {
                      const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                      });
                      resolve(compressedFile);
                    } else {
                      reject(new Error('Failed to compress image'));
                    }
                  },
                  'image/jpeg',
                  0.70
                );
              };
            };

            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );
      
      // Use FormData for file uploads (much more efficient than base64)
      const formData = new FormData();
      
      // Add all property data fields
      const { files: _, isAdmin, ...propertyData } = data;
      Object.entries(propertyData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });
      
      // Add compressed files to FormData
      compressedFiles.forEach((file) => {
        formData.append('media', file);
      });
      
      // Start upload progress tracking from 0%
      setUploadProgress(0);

      // Use admin endpoint if admin is posting
      const endpoint = data.isAdmin ? '/api/broker/properties/submit-admin' : '/api/properties/submit';
      
      // Calculate total file size for statistics
      const totalBytes = compressedFiles.reduce((sum, file) => sum + file.size, 0);
      const startTime = Date.now();
      
      // Initialize upload stats
      setUploadStats({
        uploadedBytes: 0,
        totalBytes,
        uploadSpeed: 0,
        estimatedTimeRemaining: 0,
        startTime
      });

      // Create AbortController for cancellation
      const abortController = new AbortController();
      setUploadAbortController(abortController);

      // Use XMLHttpRequest for real-time upload progress tracking
      const response = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Handle abort signal
        abortController.signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('Upload cancelled by user'));
        });
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const currentTime = Date.now();
            const elapsedTime = (currentTime - startTime) / 1000; // in seconds
            const uploadedBytes = event.loaded;
            const speed = elapsedTime > 0 ? uploadedBytes / elapsedTime : 0;
            const remainingBytes = event.total - uploadedBytes;
            const estimatedTimeRemaining = speed > 0 ? remainingBytes / speed : 0;
            
            // Update upload statistics
            setUploadStats({
              uploadedBytes,
              totalBytes: event.total,
              uploadSpeed: speed,
              estimatedTimeRemaining,
              startTime
            });
            
            // Calculate real upload progress percentage
            const realUploadPercent = (event.loaded / event.total) * 100;
            setUploadProgress(realUploadPercent);
          }
        });
        
        // Handle completion
        xhr.addEventListener('load', () => {
          setUploadProgress(95); // Leave 5% for server processing
          if (xhr.status >= 200 && xhr.status < 300) {
            // Create a Response-like object for compatibility
            const response = new Response(xhr.responseText, {
              status: xhr.status,
              statusText: xhr.statusText,
              headers: new Headers(xhr.getAllResponseHeaders().split('\r\n').reduce((headers, line) => {
                const [key, value] = line.split(': ');
                if (key && value) headers[key] = value;
                return headers;
              }, {} as Record<string, string>))
            });
            resolve(response);
          } else {
            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
          }
        });
        
        // Handle errors
        xhr.addEventListener('error', () => {
          reject(new Error('Network error occurred'));
        });
        
        xhr.addEventListener('timeout', () => {
          reject(new Error('Upload timeout'));
        });
        
        // Configure and send request
        xhr.open('POST', endpoint);
        xhr.withCredentials = true; // Include cookies for authentication
        xhr.timeout = 300000; // 5 minute timeout
        xhr.send(formData);
      });
      
      // Final progress update
      setUploadProgress(100);

      if (!response.ok) {
        // Get response text first (can only read body once)
        const responseText = await response.text();
        let errorMessage = 'Failed to submit property';
        
        try {
          // Try to parse as JSON
          const error = JSON.parse(responseText);
          errorMessage = error.message || errorMessage;
        } catch {
          // Not JSON, use the text directly
          errorMessage = responseText || response.statusText;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Keep progress at 100% for a moment before resetting
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStats({
          uploadedBytes: 0,
          totalBytes: 0,
          uploadSpeed: 0,
          estimatedTimeRemaining: 0,
          startTime: 0
        });
      }, 1000);
      
      return result;
    },
    onSuccess: (data, variables) => {
      if (variables.isAdmin) {
        // Admin posts go directly to admin browse page
        toast({
          title: "Property Published",
          description: "The property has been published successfully and is now live.",
        });
        setLocation('/admin/browse');
      } else {
        // Regular users see confirmation
        setLocation('/submission-confirmed');
      }
    },
    onError: (error: any) => {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadAbortController(null);
      setUploadStats({
        uploadedBytes: 0,
        totalBytes: 0,
        uploadSpeed: 0,
        estimatedTimeRemaining: 0,
        startTime: 0
      });
      
      // Don't show error toast if upload was cancelled by user
      if (error.message !== 'Upload cancelled by user') {
        toast({
          title: "Submission Failed",
          description: error.message || "Failed to submit property. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    const validFiles = selectedFiles.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      return isImage || isVideo;
    });

    setFiles(prev => [...prev, ...validFiles]);

    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: InsertPropertySubmission) => {
    if (files.length === 0) {
      toast({
        title: "Media Required",
        description: "Please upload at least one image or video of your property.",
        variant: "destructive",
      });
      return;
    }

    // Auto-generate title from property details
    const furni = data.isFurnished ? "Meublé" : "Non meublé";
    const floor = data.floorLevel ? ` - ${data.floorLevel}` : "";
    const salon = data.hasLivingRoom ? " - Avec salon" : "";
    const autoTitle = `${data.propertyType}${floor}${salon} - ${furni}`;
    
    // Add default sizeM2 since we removed the input field
    // Use isAdminRoute to determine if posting as admin
    submitPropertyMutation.mutate({ ...data, title: autoTitle, sizeM2: 0, files, isAdmin: isAdminRoute });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Form Section */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-3">
            {isAdminRoute ? "Ajouter une propriété (Admin)" : "Proposer votre propriété"}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            {isAdmin 
              ? "Votre propriété sera publiée immédiatement." 
              : "Toutes les informations sont privées et seront examinées par notre agent avant publication."}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Property Details Section */}
            <Card>
              <CardHeader>
                <CardTitle>Détails de la propriété</CardTitle>
                <CardDescription>Fournissez les informations sur votre propriété</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Property Type & Floor Level - First Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="propertyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de bien</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-property-type">
                              <SelectValue placeholder="Choisir le type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Apartment">Appartement</SelectItem>
                            <SelectItem value="Studio">Studio</SelectItem>
                            <SelectItem value="House">Maison / Villa</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="floorLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Étage</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="select-floor-level">
                              <SelectValue placeholder="Choisir l'étage" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Rez-de-chaussée">Rez-de-chaussée</SelectItem>
                            <SelectItem value="1er étage">1er étage</SelectItem>
                            <SelectItem value="2ème étage">2ème étage</SelectItem>
                            <SelectItem value="3ème étage">3ème étage</SelectItem>
                            <SelectItem value="4ème étage">4ème étage</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Furnished Option */}
                <FormField
                  control={form.control}
                  name="isFurnished"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meublé?</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "true")} defaultValue={field.value ? "true" : "false"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-furnished">
                            <SelectValue placeholder="Choisir" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="false">Non meublé</SelectItem>
                          <SelectItem value="true">Meublé</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Rooms, Bathrooms, Living Room - Row with Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="rooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chambres</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="select-rooms">
                              <SelectValue placeholder="Nombre" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">Studio (0)</SelectItem>
                            <SelectItem value="1">1 chambre</SelectItem>
                            <SelectItem value="2">2 chambres</SelectItem>
                            <SelectItem value="3">3 chambres</SelectItem>
                            <SelectItem value="4">4 chambres</SelectItem>
                            <SelectItem value="5">5+ chambres</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bathrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salles de bain</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="select-bathrooms">
                              <SelectValue placeholder="Nombre" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1 salle de bain</SelectItem>
                            <SelectItem value="2">2 salles de bain</SelectItem>
                            <SelectItem value="3">3+ salles de bain</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasLivingRoom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salon?</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "true")} defaultValue={field.value ? "true" : "false"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-living-room">
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="false">Non</SelectItem>
                            <SelectItem value="true">Oui</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxGuests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Voyageurs max</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="select-max-guests">
                              <SelectValue placeholder="Nombre" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1 voyageur</SelectItem>
                            <SelectItem value="2">2 voyageurs</SelectItem>
                            <SelectItem value="3">3 voyageurs</SelectItem>
                            <SelectItem value="4">4 voyageurs</SelectItem>
                            <SelectItem value="5">5 voyageurs</SelectItem>
                            <SelectItem value="6">6+ voyageurs</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Kitchen Amenities - Fridge and Gas Stove */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="hasFridge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>La cuisine a-t-elle un frigo?</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "true")} defaultValue={field.value ? "true" : "false"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-fridge">
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="false">Non</SelectItem>
                            <SelectItem value="true">Oui</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasGasStove"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Y a-t-il une cuisinière à gaz?</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "true")} defaultValue={field.value ? "true" : "false"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-gas-stove">
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="false">Non</SelectItem>
                            <SelectItem value="true">Oui</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Additional Amenities (AC, WiFi, Parking, Sea View) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  <FormField
                    control={form.control}
                    name="hasAC"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Climatisation?</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "true")} defaultValue={field.value ? "true" : "false"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="false">Non</SelectItem>
                            <SelectItem value="true">Oui</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="hasWiFi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WiFi?</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "true")} defaultValue={field.value ? "true" : "false"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="false">Non</SelectItem>
                            <SelectItem value="true">Oui</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasParking"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parking?</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "true")} defaultValue={field.value ? "true" : "false"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="false">Non</SelectItem>
                            <SelectItem value="true">Oui</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasSeaView"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vue sur mer?</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "true")} defaultValue={field.value ? "true" : "false"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="false">Non</SelectItem>
                            <SelectItem value="true">Oui</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description - Moved to bottom */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Décrivez votre propriété en détail..."
                          className="min-h-32"
                          data-testid="input-description"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Price & Reference */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix par nuit (TND)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ex: 120" 
                            data-testid="input-price"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isAdminRoute && (
                    <FormField
                      control={form.control}
                      name="referenceCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code de référence (Optionnel)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="ex: REF-001" 
                              {...field} 
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Location & Additional Information Section */}
            <Card>
              <CardHeader>
                <CardTitle>Localisation & Informations Complémentaires</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Localisation exacte</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ex: Hay Khadhra, près de l'avenue principale"
                            data-testid="input-location"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="distanceToBeach"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Distance à la plage (Optionnel)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ex: À 5 minutes à pied"
                            {...field} 
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="googleMapsUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lien Google Maps (Optionnel)</FormLabel>
                      <FormControl>
                        <Input 
                          type="url"
                          placeholder="ex: https://maps.app.goo.gl/..."
                          data-testid="input-google-maps"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        Trouvez votre propriété sur Google Maps, cliquez sur Partager, et collez le lien ici
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Media Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle>Property Media</CardTitle>
                <CardDescription>Upload images and videos of your property</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-border rounded-lg p-8 sm:p-12 text-center hover-elevate touch-manipulation">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    data-testid="input-media"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer block">
                    <Upload className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                    <p className="text-sm sm:text-base text-foreground font-medium mb-1">Tap to upload images or videos</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">PNG, JPG, MP4 up to 50MB each</p>
                  </label>
                </div>

                {/* Preview Grid */}
                {previews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {previews.map((preview, index) => (
                      <div key={index} className="relative group" data-testid={`media-preview-${index}`}>
                        <div className="aspect-square rounded-lg overflow-hidden bg-muted touch-manipulation">
                          {files[index].type.startsWith('image/') ? (
                            <img 
                              src={preview} 
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <Video className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 sm:p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation"
                          data-testid={`remove-media-${index}`}
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                        {index === 0 && (
                          <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                            Primary
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Information Section */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {isAdminRoute ? "Home Owner Contact Information" : "Your Contact Information (will only be shown to the broker !!)"}
                </CardTitle>
                <CardDescription>
                  {isAdminRoute ? "Contact information for future use" : "How can the broker reach you?"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Your full name"
                          data-testid="input-owner-name"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="ownerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="your@email.com"
                            data-testid="input-owner-email"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ownerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-muted px-3 py-2 rounded-md border border-input h-10">
                              <span className="text-sm font-medium text-foreground">+216</span>
                            </div>
                            <Input 
                              type="tel"
                              placeholder="XX XXX XXX"
                              data-testid="input-owner-phone"
                              className="flex-1"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="space-y-4">
              {/* Upload Progress Bar */}
              {isUploading && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm sm:text-base font-medium text-foreground">
                          {uploadProgress < 95 ? "Uploading your property..." : 
                           "Processing submission..."}
                        </p>
                        <p className="text-lg sm:text-xl font-bold text-primary">
                          {Math.round(uploadProgress)}%
                        </p>
                      </div>
                      
                      <Progress value={uploadProgress} className="h-4 sm:h-3" />
                      
                      {/* Upload Statistics - Show during upload phase */}
                      {uploadProgress > 0 && uploadProgress < 95 && uploadStats.totalBytes > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                          {/* Upload Speed */}
                          <div className="bg-muted/50 rounded-lg p-3 text-center">
                            <div className="font-semibold text-primary">
                              {formatSpeed(uploadStats.uploadSpeed)}
                            </div>
                            <div className="text-muted-foreground">Speed</div>
                          </div>
                          
                          {/* File Size Progress */}
                          <div className="bg-muted/50 rounded-lg p-3 text-center">
                            <div className="font-semibold text-primary">
                              {formatFileSize(uploadStats.uploadedBytes)} / {formatFileSize(uploadStats.totalBytes)}
                            </div>
                            <div className="text-muted-foreground">Uploaded</div>
                          </div>
                          
                          {/* Time Remaining */}
                          <div className="bg-muted/50 rounded-lg p-3 text-center">
                            <div className="font-semibold text-primary">
                              {formatTime(uploadStats.estimatedTimeRemaining)}
                            </div>
                            <div className="text-muted-foreground">Remaining</div>
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs sm:text-sm text-muted-foreground text-center">
                        {uploadProgress < 95 ? "Uploading files to server" :
                         "Almost done! Finalizing your property listing"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                {isUploading ? (
                  <Button 
                    type="button" 
                    variant="outline" 
                    data-testid="button-cancel" 
                    onClick={cancelUpload}
                    className="w-full sm:w-auto order-2 sm:order-1"
                  >
                    Cancel Upload
                  </Button>
                ) : (
                  <Link href="/" className="order-2 sm:order-1">
                    <Button 
                      type="button" 
                      variant="outline" 
                      data-testid="button-cancel" 
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                  </Link>
                )}
                <Button 
                  type="submit" 
                  size="lg"
                  disabled={submitPropertyMutation.isPending || isUploading}
                  data-testid="button-submit"
                  className="w-full sm:w-auto order-1 sm:order-2 h-12 text-base font-semibold"
                >
                  {isUploading ? "Uploading..." : submitPropertyMutation.isPending ? "Submitting..." : "Submit Property"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
