import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  PawPrint, 
  ArrowLeft, 
  Target, 
  Heart, 
  Users,
  CheckCircle
} from 'lucide-react';

export default function About() {
  const benefits = [
    'Complete digital health records for all livestock',
    'Real-time symptom tracking and disease monitoring',
    'Direct connection with certified veterinarians',
    'Vaccination and medication schedule management',
    'Follow-up reminders and health alerts',
    'Detailed reports and analytics',
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <PawPrint className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-xl">CattleHealth</span>
          </Link>
          <Link to="/">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        {/* Hero */}
        <div className="max-w-3xl mx-auto text-center mb-16 animate-fade-in">
          <h1 className="text-4xl lg:text-5xl font-heading font-bold mb-6">
            About CattleHealth
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            CattleHealth is a comprehensive livestock health management system designed to bridge the gap between farmers and veterinarians, ensuring better health outcomes for cattle across the country.
          </p>
        </div>

        {/* Mission Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="shadow-card">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Target className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Our Mission</h3>
              <p className="text-muted-foreground">
                To provide farmers with accessible, digital tools for managing their livestock health and connecting with veterinary professionals.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto">
                <Heart className="w-7 h-7 text-success" />
              </div>
              <h3 className="text-xl font-semibold">Our Values</h3>
              <p className="text-muted-foreground">
                We believe in proactive healthcare, transparency in treatment, and empowering farmers with knowledge about their animals' health.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto">
                <Users className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-xl font-semibold">Our Community</h3>
              <p className="text-muted-foreground">
                Join a growing community of farmers and veterinarians working together for better livestock health outcomes.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Benefits */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-heading font-bold mb-8 text-center">
            Why Choose CattleHealth?
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
                <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <span className="text-sm font-medium">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/auth">
              <Button size="lg">
                Get Started Today
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}