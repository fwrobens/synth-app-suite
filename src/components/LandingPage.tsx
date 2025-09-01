import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sparkles, Code, Zap, Github, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-gradient">SynthApp</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign in
            </Button>
            <Button variant="hero" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary">From prompt to product fast.</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Build Your App or
            <br />
            <span className="text-gradient">Website. Just Describe It.</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            SynthApp turns your ideas into real, working apps and websites. Simply
            describe what you need—we'll handle the code, design, and logic.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <div className="relative">
              <input
                type="text"
                placeholder="A modern portfolio website with dark theme and contact form"
                className="w-full sm:w-96 px-6 py-4 rounded-lg bg-card border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                readOnly
              />
              <Button 
                variant="hero" 
                size="lg" 
                className="absolute right-2 top-2 bottom-2"
                onClick={() => navigate("/auth")}
              >
                Generate
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {[
              { icon: Zap, label: "Instant Preview" },
              { icon: Code, label: "Full-Stack Apps" },
              { icon: Sparkles, label: "AI-Powered" }
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/40">
                <feature.icon className="w-4 h-4 text-primary" />
                <span className="text-sm">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to build amazing apps
            </h2>
            <p className="text-xl text-muted-foreground">
              Powered by advanced AI and modern web technologies
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "AI-Powered Generation",
                description: "Describe your app in plain English and watch it come to life instantly",
                icon: Sparkles
              },
              {
                title: "Live Preview",
                description: "See your app running in real-time with instant updates as you chat",
                icon: Zap
              },
              {
                title: "Full Stack Support",
                description: "From simple landing pages to complex web applications with databases",
                icon: Code
              }
            ].map((feature, index) => (
              <Card key={index} className="p-6 card-gradient border-border/40 hover:shadow-card transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-hero rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to build something amazing?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of developers and creators who are building faster with AI
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" onClick={() => navigate("/auth")}>
              Start Building Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" size="lg">
              <Github className="w-4 h-4 mr-2" />
              View Examples
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 SynthApp. Build your dreams with AI.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;