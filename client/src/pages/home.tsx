import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Building2, Home, MapPin, Users, CheckCircle2 } from "lucide-react";
import heroImage from "/hero-background.png";
import Navbar from "@/components/navbar";
import { SEO } from "@/components/seo";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SEO 
        title="Laith Kelibia — Location Maisons S+2, Appartements & Villas à Kelibia, Tunisie"
        description="Location saisonnière à Kelibia : maisons S+1, S+2, S+3, appartements meublés, villas vue mer, studios près de la plage. Vacances d'été au Cap Bon. Réservation facile."
        keywords="location kelibia, location maison kelibia, maison s+2 kelibia, maison s+3 kelibia, location appartement meublé kelibia, villa kelibia, studio kelibia, location saisonnière kelibia, vacances été kelibia, location bord de mer kelibia, immobilier kelibia, dar kelibia, location cap bon, hébergement kelibia plage, maison à louer kelibia été"
        url="https://laith-kelibia.tn/"
      />
      <Navbar />

      {/* Hero Section */}
      <section 
        className="relative h-screen flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70" />
        
        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
            Find Your Perfect Home
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto">
            Connecting property owners and tenants in Hay Khadhra & Cité Olympique neighborhoods
          </p>
          
          {/* Two-Choice Gateway */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            
            <Link href="/browse-properties" data-testid="link-browse-properties">
              <Button 
                size="lg"
                variant="outline"
                className="w-full sm:w-auto px-12 py-6 text-lg font-semibold backdrop-blur-md bg-background/10 border-2 border-white/30 text-white hover:bg-white/20"
                data-testid="button-browse-properties"
              >
                <Home className="mr-2 h-6 w-6" />
                I Need a Place to Rent
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Indicators Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6" data-testid="stat-properties">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-primary/10 text-primary mb-4">
                <Building2 className="w-8 h-8" />
              </div>
              <div className="text-4xl font-bold text-foreground mb-2">100+</div>
              <div className="text-muted-foreground">Properties Listed</div>
            </div>
            
            <div className="text-center p-6" data-testid="stat-tenants">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-primary/10 text-primary mb-4">
                <Users className="w-8 h-8" />
              </div>
              <div className="text-4xl font-bold text-foreground mb-2">500+</div>
              <div className="text-muted-foreground">Happy Tenants</div>
            </div>
            
            <div className="text-center p-6" data-testid="stat-neighborhoods">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-primary/10 text-primary mb-4">
                <MapPin className="w-8 h-8" />
              </div>
              <div className="text-4xl font-bold text-foreground mb-2">2</div>
              <div className="text-muted-foreground">Prime Neighborhoods</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-16">
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* For Property Owners */}
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-3">
                <Building2 className="w-6 h-6 text-primary" />
                For Property Owners
              </h3>
              
              <div className="space-y-6">
                <div className="flex gap-4" data-testid="step-owner-1">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Submit Your Property</h4>
                    <p className="text-muted-foreground">Fill out a simple form with your property details and upload photos.</p>
                  </div>
                </div>
                
                <div className="flex gap-4" data-testid="step-owner-2">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Broker Review</h4>
                    <p className="text-muted-foreground">Our trusted broker reviews your listing for quality and accuracy.</p>
                  </div>
                </div>
                
                <div className="flex gap-4" data-testid="step-owner-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Get Connected</h4>
                    <p className="text-muted-foreground">Once approved, we'll connect you with interested tenants.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* For Tenants */}
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-3">
                <Home className="w-6 h-6 text-primary" />
                For Tenants
              </h3>
              
              <div className="space-y-6">
                <div className="flex gap-4" data-testid="step-tenant-1">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Browse Verified Listings</h4>
                    <p className="text-muted-foreground">Explore properties that have been verified by our broker.</p>
                  </div>
                </div>
                
                <div className="flex gap-4" data-testid="step-tenant-2">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">View Details</h4>
                    <p className="text-muted-foreground">See photos, videos, and complete property information.</p>
                  </div>
                </div>
                
                <div className="flex gap-4" data-testid="step-tenant-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Contact Broker</h4>
                    <p className="text-muted-foreground">Reach out to arrange viewings and get more information.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-background border-t border-border">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-muted-foreground">
            © {new Date().getFullYear()} Edarna — Hay Khadhra & Cité Olympique. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
