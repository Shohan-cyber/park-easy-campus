import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Car, Shield, Clock, ParkingSquare, ArrowRight } from "lucide-react";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <nav className="relative container mx-auto flex items-center justify-between py-6 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Car className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">CampusPark</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button>Get Started <ArrowRight className="w-4 h-4 ml-1" /></Button>
            </Link>
          </div>
        </nav>

        <div className="relative container mx-auto px-4 py-24 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-6">
            <ParkingSquare className="w-3.5 h-3.5" /> Smart Campus Parking
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Park smarter,
            <br />
            <span className="text-primary">not harder.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            Book, manage, and track campus parking in real time. Automated billing, role-based access, and zero hassle.
          </p>
          <Link to="/auth">
            <Button size="lg" className="text-base px-8 h-12">
              Start Parking <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: ParkingSquare, title: "Real-Time Slots", desc: "See available parking instantly with live status updates across all zones." },
            { icon: Shield, title: "Role-Based Access", desc: "Secure access for Admin, Staff, and Users with proper authorization controls." },
            { icon: Clock, title: "Auto Billing", desc: "Time-based billing with minimum 1-hour charge. No manual calculations." },
          ].map((f) => (
            <div key={f.title} className="stat-card">
              <f.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 CampusPark. Smart Campus Parking System.</p>
      </footer>
    </div>
  );
}
