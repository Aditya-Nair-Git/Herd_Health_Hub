import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WebstatsWidget } from '@/components/WebstatsWidget';
import { 
  PawPrint, 
  Stethoscope, 
  ClipboardList, 
  Shield, 
  ChevronRight,
  Activity,
  Users
} from 'lucide-react';

export default function Index() {
  const features = [
    {
      icon: PawPrint,
      title: 'Animal Registration',
      description: 'Register and track all your livestock with detailed health records and history.',
    },
    {
      icon: Stethoscope,
      title: 'Vet Consultations',
      description: 'Connect with veterinarians for diagnoses, prescriptions, and follow-up care.',
    },
    {
      icon: ClipboardList,
      title: 'Health Monitoring',
      description: 'Track symptoms, vaccinations, and medications for each animal.',
    },
    {
      icon: Activity,
      title: 'Real-time Alerts',
      description: 'Get notified about follow-ups, vaccination due dates, and health concerns.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-95" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
        
        <nav className="relative z-10 container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center">
              <PawPrint className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-xl text-primary-foreground">Hoovrr</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/about">
              <Button variant="ghost" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
                About
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="secondary" className="shadow-lg">
                Login / Sign Up
              </Button>
            </Link>
          </div>
        </nav>

        <div className="relative z-10 container mx-auto px-4 py-24 lg:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20">
              <Shield className="w-4 h-4 text-primary-foreground" />
              <span className="text-sm font-medium text-primary-foreground">Trusted by 500+ Farmers</span>
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-heading font-bold text-primary-foreground leading-tight">
              Complete Health Management for Your Livestock
            </h1>
            
            <p className="text-lg lg:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
              Track, diagnose, and manage your cattle's health with our comprehensive system. Connect with veterinarians and keep detailed medical records.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="text-base px-8 shadow-lg">
                  Get Started Free
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/admin/demo">
                <Button size="lg" variant="ghost" className="text-base text-primary-foreground hover:bg-primary-foreground/10">
                  Admin Demo Access
                </Button>
              </Link>
              <Link to="/about">
                <Button size="lg" variant="ghost" className="text-base text-primary-foreground hover:bg-primary-foreground/10">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </header>

      {/* Features Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold mb-4">
              Everything You Need to Manage Cattle Health
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive platform connects farmers with veterinarians for better livestock care.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="group border-border/50 shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <feature.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-secondary/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 text-primary">
              <Users className="w-5 h-5" />
              <span className="font-medium">For Farmers & Veterinarians</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-heading font-bold">
              Ready to Improve Your Livestock Health Management?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join hundreds of farmers and veterinarians using Hoovrr to keep their animals healthy and productive.
            </p>
            <Link to="/auth">
              <Button size="lg" className="text-base px-8">
                Start Managing Today
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <PawPrint className="w-5 h-5 text-primary" />
              <span className="font-heading font-semibold">Hoovrr</span>
            </div>
            <WebstatsWidget />
            <div className="flex items-center gap-4">
              <Link to="/admin/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Admin Login
              </Link>
              <p className="text-sm text-muted-foreground">
                © 2026 Hoovrr. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}