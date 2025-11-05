import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import Navbar from "@/components/navbar";

export default function SubmissionConfirmedPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center p-6 min-h-[calc(100vh-80px)]">
        <Card className="max-w-md w-full">
        <CardContent className="pt-12 pb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary mb-6">
            <CheckCircle2 className="w-12 h-12" data-testid="icon-success" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-4" data-testid="text-title">
            Thank You!
          </h1>
          
          <p className="text-muted-foreground text-lg mb-2" data-testid="text-message">
            Your property submission has been received.
          </p>
          
          <p className="text-muted-foreground mb-8">
            The broker will review your listing and contact you shortly.
          </p>
          
          <Link href="/">
            <Button size="lg" className="w-full" data-testid="button-return-home">
              Return to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
