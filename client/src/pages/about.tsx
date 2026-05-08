import Navbar from "@/components/navbar";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { MapPin, Shield, Star, MessageCircle, Home, Key, TrendingUp } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="À Propos — Laith Kelibia | Agence Immobilière à Kelibia, Tunisie" 
        description="Laith Kelibia, votre agence immobilière locale à Kelibia. Spécialistes en location saisonnière, location longue durée et gestion de biens. Appartements, villas et maisons de vacances vérifiés près de la plage."
        keywords="agence immobilière kelibia, location saisonnière kelibia, gestion locative kelibia, location longue durée kelibia, agence location tunisie, expert immobilier nabeul, louer maison kelibia"
        url="https://laith-kelibia.tn/about"
      />
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 bg-primary/5 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/kelibia%20plage.png')] bg-cover bg-center opacity-10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          {/* Agency badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-6">
            <Home className="w-3.5 h-3.5" />
            Location à Kelibia
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight mb-6">
            Votre Partenaire de Confiance à <span className="text-primary">Kelibia</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Spécialistes de l'immobilier à Kelibia — location saisonnière, location longue durée et vente de biens. Nous vous accompagnons à chaque étape de votre projet.
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
          <div>
            <h2 className="text-3xl font-bold mb-6 text-foreground">Notre Histoire</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              <strong className="text-foreground">Laith Kelibia</strong> est née d'une passion pour Kelibia, son fort historique et ses plages de sable fin considérées parmi les plus belles du bassin méditerranéen.
            </p>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Spécialisés dans la <strong className="text-foreground">location saisonnière</strong> et la <strong className="text-foreground">location longue durée</strong>, nous gérons une sélection rigoureuse d'appartements, villas et maisons de vacances pour garantir à nos clients un confort irréprochable.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Notre objectif : faciliter la connexion entre les visiteurs en quête d'évasion et les propriétaires locaux, avec transparence et professionnalisme.
            </p>
          </div>
          <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-xl">
            <img 
              src="/kelibia%20plage.png" 
              alt="Plage de Kelibia" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2.5 inline-flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-semibold text-foreground">Kelibia, Nabeul — Tunisie</span>
              </div>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary/70">Ce que nous faisons</span>
            <h2 className="text-3xl font-bold mt-2 text-foreground">Nos Services Immobiliers</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center p-6 bg-card rounded-2xl border border-border/40 shadow-sm text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                <Home className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-2">Location Saisonnière</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Appartements, villas et maisons de vacances pour des séjours courts ou longs à Kelibia.
              </p>
            </div>

            <div className="flex flex-col items-center p-6 bg-card rounded-2xl border border-border/40 shadow-sm text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                <Key className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-2">Location Longue Durée</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Des biens sélectionnés pour une installation durable, avec accompagnement complet.
              </p>
            </div>

            <div className="flex flex-col items-center p-6 bg-card rounded-2xl border border-border/40 shadow-sm text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-2">Gestion de Biens</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Confiez-nous votre bien. Nous gérons la mise en location, la visibilité et les locataires.
              </p>
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="text-center mb-20">
          <span className="text-xs font-bold uppercase tracking-widest text-primary/70">Pourquoi nous</span>
          <h2 className="text-3xl font-bold mt-2 mb-12 text-foreground">Nos Engagements</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="flex flex-col items-center p-6 bg-card rounded-2xl border border-border/40 shadow-sm">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
                <Star className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Qualité Premium</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Chaque bien est vérifié et sélectionné selon nos standards exigeants de propreté et de confort.
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
              <h3 className="text-xl font-bold mb-3">Transparence Totale</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Contact direct, pas de frais cachés. Une communication honnête et rapide à chaque étape.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-primary rounded-3xl p-8 sm:p-12 text-center text-primary-foreground shadow-lg">
          <div className="text-xs font-bold uppercase tracking-widest opacity-70 mb-3">Laith Kelibia</div>
          <h2 className="text-3xl font-bold mb-4">Prêt à concrétiser votre projet ?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto text-lg">
            Contactez-nous sur WhatsApp pour nous faire part de vos besoins. Location, achat ou gestion — nous trouverons la solution idéale.
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
            © {new Date().getFullYear()} Laith Kelibia — Tous droits réservés
          </p>
        </div>
      </footer>
    </div>
  );
}
