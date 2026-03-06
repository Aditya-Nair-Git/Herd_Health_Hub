import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PawPrint, ArrowLeft, Eye, Code2 } from 'lucide-react';

export default function About() {
  const developers = [
    {
      name: 'Adi Nair',
      initials: 'AN',
      role: 'Developer — Cattle Health Management System',
      description:
        "Hi, I'm Adi Nair — a Computer Science student passionate about building technology that solves real-world problems. I developed the Cattle Health Management System to make livestock healthcare more organized and accessible.\n\nFarmers often rely on manual communication and scattered records when coordinating with veterinarians, which can lead to missed appointments and incomplete medical histories. This platform was designed to simplify that process by creating a centralized system where farmers, veterinarians, and administrators can coordinate animal healthcare efficiently.",
    },
    {
      name: 'Paras Vyas',
      initials: 'PV',
      role: 'Developer — Platform Design & Coordination',
      description:
        "Hi, I'm Paras Vyas — a Computer Science student passionate about building technology that solves real-world problems. I created this cattle health platform to make it easier for farmers to connect with veterinarians, schedule appointments efficiently, and maintain organized health records for their livestock.\n\nMy focus is on designing simple, reliable, and practical digital solutions that support the agricultural community and make livestock healthcare easier to manage.",
    },
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
            <span className="font-heading font-bold text-xl">Hoovrr</span>
          </Link>
          <Link to="/">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 space-y-20">
        {/* Our Vision */}
        <section className="max-w-3xl mx-auto animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Eye className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-heading font-bold">Our Vision</h1>
          </div>

          <div className="space-y-5 text-muted-foreground leading-relaxed text-base">
            <p>
              When we looked at the healthcare landscape, we noticed that a large number of organizations, platforms, and technological solutions are focused on human healthcare. While this progress is valuable, animal health — especially livestock health — receives far less technological attention, even though it plays a crucial role in agriculture, food supply, and the livelihood of millions of farmers.
            </p>
            <p>
              This observation inspired us to explore how technology could help bridge that gap. Farmers often manage the health of their animals through scattered records, manual communication with veterinarians, and informal scheduling, which makes it difficult to track treatments, vaccinations, and medical histories effectively.
            </p>
            <p>
              With this in mind, we set out to build a centralized digital system that connects farmers, veterinarians, and administrators on a single platform. The goal is to create a space where farmers can easily register their animals, track health records, book veterinary appointments, and manage treatments — while veterinarians maintain organized medical histories and coordinate care efficiently.
            </p>
            <p>
              Through <span className="font-semibold text-foreground">Hoovrr</span>, we hope to introduce a meaningful technology layer into livestock healthcare, making it more organized, accessible, and reliable — while empowering farmers with better tools to care for their animals.
            </p>
          </div>
        </section>

        {/* About the Developers */}
        <section className="max-w-4xl mx-auto animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Code2 className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-heading font-bold">About the Developers</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {developers.map((dev) => (
              <Card key={dev.name} className="shadow-card">
                <CardContent className="p-8 space-y-5">
                  <div className="flex flex-col items-center text-center gap-3">
                    <Avatar className="w-20 h-20 text-lg">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
                        {dev.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold">{dev.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{dev.role}</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {dev.description}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/auth">
              <Button size="lg">Get Started Today</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
