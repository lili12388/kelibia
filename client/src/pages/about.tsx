import Navbar from "@/components/navbar";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { MapPin, Heart, Shield, Star, MessageCircle } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="À Propos - laith-kelibia" 
        description="Découvrez l'histoire de laith-kelibia, votre expert local pour la location de maisons de vacances, appartements et villas à Kelibia." 
      />
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 bg-primary/5 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/kelibia%20plage.png')] bg-cover bg-center opacity-10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight mb-6">
            Votre Partenaire de Confiance à <span className="text-primary">Kelibia</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Nous sommes passionnés par notre ville et dédiés à vous offrir les meilleures expériences de séjour sur les plus belles plages de la Méditerranée.
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
          <div>
            <h2 className="text-3xl font-bold mb-6 text-foreground">Notre Histoire</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              laith-kelibia est née d'une passion pour Kelibia, son fort historique et ses plages de sable fin considérées parmi les plus belles au monde. Notre objectif a toujours été simple : faciliter la connexion entre les visiteurs en quête d'évasion et les propriétaires locaux.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Aujourd'hui, nous gérons une sélection rigoureuse d'appartements, de villas et de maisons de vacances pour garantir à nos voyageurs un confort irréprochable et des souvenirs inoubliables.
            </p>
          </div>
          <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-xl">
            <img 
              src="/kelibia%20plage.png" 
              alt="Plage de Kelibia" 
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Values */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-12 text-foreground">Pourquoi Nous Choisir ?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="flex flex-col items-center p-6 bg-card rounded-2xl border border-border/40 shadow-sm">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
                <Star className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Qualité Premium</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Chaque logement est vérifié et sélectionné pour répondre à nos standards de propreté et de confort.
              </p>
            </div>
            
            <div className="flex flex-col items-center p-6 bg-card rounded-2xl border border-border/40 shadow-sm">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
                <MapPin className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Expertise Locale</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Nous sommes sur place. Nous connaissons les meilleurs quartiers, les plages cachées et les bonnes adresses.
              </p>
            </div>

            <div className="flex flex-col items-center p-6 bg-card rounded-2xl border border-border/40 shadow-sm">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Réservation Sécurisée</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Un contact direct et transparent. Pas de frais cachés, juste une communication honnête et rapide.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-primary rounded-3xl p-8 sm:p-12 text-center text-primary-foreground shadow-lg">
          <h2 className="text-3xl font-bold mb-4">Prêt à planifier vos vacances ?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto text-lg">
            Contactez-nous directement sur WhatsApp pour nous faire part de vos dates et de vos besoins. Nous trouverons la perle rare pour vous.
          </p>
          <a 
            href="https://wa.me/21650344187"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <Button size="lg" className="bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full font-bold px-8 h-14 text-lg border-0 shadow-lg gap-2">
              <MessageCircle className="w-5 h-5" />
              Discuter sur WhatsApp
            </Button>
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 border-t border-border/30 bg-card/50 mt-12">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} laith-kelibia - Tous droits réservés
          </p>
        </div>
      </footer>
    </div>
  );
}
