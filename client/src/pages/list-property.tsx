import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      description: "",
      rooms: 1,
      bathrooms: 1,
      location: "",
      price: "",
      ownerName: "",
      ownerEmail: "",
      ownerPhone: "",
      status: "pending",
      googleMapsUrl: "",
      requiresDeposit: true,
      neighborhoodMapUrl: null,
    },
  });

  const submitPropertyMutation = useMutation({
    mutationFn: async (data: InsertPropertySubmission & { files: File[]; isAdmin?: boolean }) => {
      // Convert files to base64
      const mediaFiles = await Promise.all(
        files.map((file) => {
          return new Promise<{ filename: string; mimeType: string; dataUrl: string }>((resolve, reject) => {
            // For images, compress them before converting to base64
            if (file.type.startsWith('image/')) {
              const img = new Image();
              const reader = new FileReader();
              
              reader.onload = (e) => {
                img.src = e.target?.result as string;
                
                img.onload = () => {
                  // Create canvas to resize/compress image
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d')!;
                  
                  // Max dimensions to keep file size reasonable
                  const MAX_WIDTH = 1920;
                  const MAX_HEIGHT = 1080;
                  
                  let width = img.width;
                  let height = img.height;
                  
                  // Calculate new dimensions while maintaining aspect ratio
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
                  
                  // Convert to JPEG with 85% quality for good compression
                  const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                  
                  resolve({
                    filename: file.name.replace(/\.[^/.]+$/, '.jpg'), // Change extension to .jpg
                    mimeType: 'image/jpeg',
                    dataUrl: compressedDataUrl,
                  });
                };
              };
              
              reader.onerror = reject;
              reader.readAsDataURL(file);
            } else {
              // For videos, use original (no compression)
              const reader = new FileReader();
              reader.onloadend = () => {
                resolve({
                  filename: file.name,
                  mimeType: file.type,
                  dataUrl: reader.result as string,
                });
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            }
          });
        })
      );

      // Prepare JSON body
      const { files: _, isAdmin, ...propertyData } = data;
      const body = {
        propertyData,
        mediaFiles,
      };

      // Use admin endpoint if admin is posting
      const endpoint = data.isAdmin ? '/api/broker/properties/submit-admin' : '/api/properties/submit';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit property');
      }

      return response.json();
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
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit property. Please try again.",
        variant: "destructive",
      });
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
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-3">
            {isAdminRoute ? "Post Property as Admin" : "List Your Property"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {isAdmin 
              ? "Your property will be published immediately and appear on the browse page." 
              : "All information is private and will be reviewed by our broker before publication."}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Property Details Section */}
            <Card>
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
                <CardDescription>Provide information about your property</CardDescription>
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

                {/* Price & Deposit - Moved up */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loyer mensuel (TND)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ex: 1200" 
                            data-testid="input-price"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requiresDeposit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cautionnement requis?</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "true")} defaultValue={field.value ? "true" : "false"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-deposit">
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
              </CardContent>
            </Card>

            {/* Location & Additional Information Section */}
            <Card>
              <CardHeader>
                <CardTitle>Localisation & Informations Complémentaires</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
                <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover-elevate">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    data-testid="input-media"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-foreground font-medium mb-1">Click to upload images or videos</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG, MP4 up to 50MB each</p>
                  </label>
                </div>

                {/* Preview Grid */}
                {previews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {previews.map((preview, index) => (
                      <div key={index} className="relative group" data-testid={`media-preview-${index}`}>
                        <div className="aspect-square rounded-lg overflow-hidden bg-muted">
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
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeFile(index)}
                          data-testid={`button-remove-media-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
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
            <div className="flex justify-end gap-4">
              <Link href="/">
                <Button type="button" variant="outline" data-testid="button-cancel">
                  Cancel
                </Button>
              </Link>
              <Button 
                type="submit" 
                size="lg"
                disabled={submitPropertyMutation.isPending}
                data-testid="button-submit"
              >
                {submitPropertyMutation.isPending ? "Submitting..." : "Submit Property"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
