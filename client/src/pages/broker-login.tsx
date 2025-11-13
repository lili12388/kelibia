import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/navbar";

export default function BrokerLoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      console.log('Attempting login with password:', password);
      const response = await apiRequest('POST', '/api/broker/login', { password });
      const data = await response.json();
      console.log('Login response:', data);
      return data;
    },
    onSuccess: async (data) => {
      console.log('Login successful, data:', data);
      // Invalidate auth status to refresh the navbar
      await queryClient.invalidateQueries({ queryKey: ['/api/broker/auth-status'] });
      
      // Wait for the auth status to be refetched and updated
      await queryClient.refetchQueries({ queryKey: ['/api/broker/auth-status'] });
      
      toast({
        title: "Login Successful",
        description: "Welcome back, admin!",
      });
      
      // Navigate to admin browse page
      setLocation('/admin/browse');
    },
    onError: (error: any) => {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      loginMutation.mutate(password);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center p-6 min-h-[calc(100vh-80px)]">
        <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl">Broker Login</CardTitle>
          <CardDescription>
            Enter your password to access the broker dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter broker password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
