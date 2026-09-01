'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  ArrowRight, Check, BarChart3, Users, Globe, Shield,
  Zap, Database, MousePointerClick, TrendingUp, Star,
  Menu, X, ChevronRight, ShoppingBag, UserCircle,
} from 'lucide-react';

const features = [
  { icon: MousePointerClick, title: 'Event Tracking', desc: 'Capture every user interaction with auto-tracked clicks, scrolls, form submissions, and custom events.' },
  { icon: UserCircle, title: '360° Customer Profiles', desc: 'Unified customer view combining anonymous and identified data across all touchpoints.' },
  { icon: Database, title: 'Identity Resolution', desc: 'Merge anonymous visitors with known users via email, phone, user ID, and device fingerprinting.' },
  { icon: BarChart3, title: 'Real-time Analytics', desc: 'Live dashboards with event breakdowns, traffic sources, device analytics, and conversion funnels.' },
  { icon: TrendingUp, title: 'Attribution Models', desc: 'First-touch, last-touch, linear, and time-decay attribution to understand what drives conversions.' },
  { icon: ShoppingBag, title: 'Meta Integration', desc: 'Server-side Meta Conversion API integration with automatic event mapping and PII hashing.' },
  { icon: Globe, title: 'Multi-website', desc: 'Track multiple websites and applications from a single platform with isolated data per site.' },
  { icon: Shield, title: 'GDPR Compliant', desc: 'Built-in consent management, IP anonymization, and automatic data retention policies.' },
];

const pricingPlans = [
  {
    name: 'Starter', price: '$29', description: 'For small projects and startups',
    features: ['Up to 10,000 events/mo', '1 website', '7-day data retention', 'Basic analytics', 'Email support'],
    cta: 'Get Started', popular: false,
  },
  {
    name: 'Growth', price: '$99', description: 'For growing businesses',
    features: ['Up to 100,000 events/mo', '10 websites', '30-day data retention', 'Advanced analytics', 'CDP features', 'Meta Integration', 'Priority support'],
    cta: 'Start Free Trial', popular: true,
  },
  {
    name: 'Business', price: '$299', description: 'For established companies',
    features: ['Up to 1M events/mo', 'Unlimited websites', '90-day data retention', 'All analytics features', 'Full CDP', 'All integrations', 'Custom roles', 'Dedicated support'],
    cta: 'Contact Sales', popular: false,
  },
];

const testimonials = [
  { name: 'Sarah Chen', role: 'CTO, TechStart Inc', content: 'CustomerLab transformed how we understand our users. The identity resolution is incredible.', rating: 5 },
  { name: 'Marcus Johnson', role: 'Head of Marketing, GrowthCo', content: 'The attribution models alone saved us 30% on ad spend. Game-changing platform.', rating: 5 },
  { name: 'Emily Davis', role: 'Product Manager, SaaS Labs', content: 'Implementing tracking was a breeze. The 360° profiles give us insights we never had before.', rating: 5 },
];

const faqs = [
  { q: 'How does the tracking script work?', a: 'Simply add our JavaScript snippet to your website\'s <head> tag. It automatically tracks page views, clicks, scrolls, and form submissions with zero configuration.' },
  { q: 'Can I track multiple websites?', a: 'Yes, you can track unlimited websites across all paid plans. Each website gets its own tracking script and API key.' },
  { q: 'Is CustomerLab GDPR compliant?', a: 'Absolutely. We offer consent management, IP anonymization, data retention controls, and the ability to delete user data on request.' },
  { q: 'How does identity resolution work?', a: 'Our engine matches anonymous visitors to known profiles using email, phone, user ID, and device fingerprints. All data is merged into a single 360° view.' },
  { q: 'Can I export my data?', a: 'Yes, you can export data in CSV, JSON, and PDF formats. We also offer API access for programmatic data retrieval.' },
  { q: 'What integrations do you support?', a: 'We support Meta Conversion API, Google Ads, and HubSpot, with more integrations coming soon.' },
];

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="font-bold text-lg">CustomerLab</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              {['Features', 'Pricing', 'Docs', 'API'].map((item) => (
                <Link key={item} href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {item}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="hidden sm:inline-flex">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileMenu && (
          <div className="md:hidden border-t p-4 space-y-3">
            {['Features', 'Pricing', 'Docs', 'API'].map((item) => (
              <Link key={item} href="#" className="block text-sm py-2">{item}</Link>
            ))}
            <Link href="/login"><Button variant="outline" className="w-full">Sign In</Button></Link>
            <Link href="/register"><Button className="w-full">Get Started</Button></Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container relative py-24 lg:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4 px-3 py-1">
              <Zap className="w-3 h-3 mr-1" />
              Now with 360° Customer Profiles
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
              Understand Your Customers
              <span className="text-primary"> Across Every Touchpoint</span>
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The modern Customer Data Platform that unifies tracking, identity resolution, analytics, and marketing integrations in one seamless platform.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 text-base">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="#">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                  View Documentation
                </Button>
              </Link>
            </div>
            <div className="flex items-center justify-center gap-8 mt-8 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Check className="w-4 h-4 text-success" /> No credit card</span>
              <span className="flex items-center gap-1"><Check className="w-4 h-4 text-success" /> 14-day trial</span>
              <span className="flex items-center gap-1"><Check className="w-4 h-4 text-success" /> Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="border-b py-12">
        <div className="container">
          <p className="text-center text-sm text-muted-foreground mb-8">Trusted by innovative companies worldwide</p>
          <div className="flex flex-wrap justify-center gap-12 opacity-50">
            {['Acme Corp', 'TechStart', 'GrowthCo', 'SaaS Labs', 'DataFlow', 'CloudBase'].map((name) => (
              <span key={name} className="text-lg font-bold text-muted-foreground">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete CDP platform with event tracking, identity resolution, analytics, and integrations.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="hover:shadow-lg transition-shadow border-0 bg-muted/30">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Analytics Preview */}
      <section className="border-b py-24">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">Analytics</Badge>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">Real-Time Analytics Dashboard</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Monitor your data in real-time with beautiful charts, traffic source analysis, device breakdowns, and conversion funnel visualization.
              </p>
              <ul className="space-y-3">
                {['Live visitor monitoring', 'Event breakdown by type', 'Traffic source attribution', 'Device and browser analytics', 'Geo-location mapping'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <Card className="shadow-2xl">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Events', value: '89.2K', change: '+12%' },
                        { label: 'Visitors', value: '45.6K', change: '+8%' },
                        { label: 'Conversion', value: '3.2%', change: '+0.5%' },
                      ].map((m) => (
                        <div key={m.label} className="p-3 rounded-xl bg-muted/50">
                          <p className="text-xs text-muted-foreground">{m.label}</p>
                          <p className="text-lg font-bold">{m.value}</p>
                          <span className="text-xs text-success">{m.change}</span>
                        </div>
                      ))}
                    </div>
                    <div className="h-[120px] bg-muted/30 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-b py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Get started in minutes with our simple setup process.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Connect Your Website', desc: 'Add your domain and get a unique tracking script. Paste it in your <head> tag.' },
              { step: '02', title: 'Start Collecting Data', desc: 'Automatically track page views, clicks, scrolls, and form submissions. No extra code needed.' },
              { step: '03', title: 'Analyze & Act', desc: 'View real-time analytics, build customer profiles, create audiences, and integrate with your tools.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold">{item.step}</span>
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-b py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Loved by Teams</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">See what our customers have to say.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <Card key={t.name} className="border-0 bg-muted/30">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">&ldquo;{t.content}&rdquo;</p>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Choose the plan that fits your needs. No hidden fees.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card key={plan.name} className={`relative ${plan.popular ? 'ring-2 ring-primary shadow-xl' : 'border-0 bg-muted/30'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gap-1"><Star className="w-3 h-3" /> Most Popular</Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/register">
                    <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                      {plan.cta}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b py-24">
        <div className="container max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details key={faq.q} className="group">
                <summary className="flex items-center justify-between p-4 rounded-xl bg-muted/30 cursor-pointer list-none">
                  <span className="font-medium text-sm">{faq.q}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <p className="px-4 pb-4 pt-2 text-sm text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of companies already using CustomerLab to understand their customers better.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 text-base">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="#">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                  Talk to Sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                  <span className="text-white font-bold text-[10px]">C</span>
                </div>
                <span className="font-bold">CustomerLab</span>
              </div>
              <p className="text-xs text-muted-foreground">Modern Customer Data Platform</p>
            </div>
            {[['Product', ['Features', 'Pricing', 'API', 'Changelog']], ['Resources', ['Documentation', 'Guides', 'API Reference', 'Status']], ['Company', ['About', 'Blog', 'Careers', 'Contact']]].map(([title, links]) => (
              <div key={title as string}>
                <h4 className="text-sm font-semibold mb-3">{title as string}</h4>
                <ul className="space-y-2">
                  {(links as string[]).map((link) => (
                    <li key={link}><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t pt-8 text-center text-xs text-muted-foreground">
            &copy; 2026 CustomerLab. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
