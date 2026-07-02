import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { SplashWrapper } from "@/components/landing/SplashWrapper";
import {
  ArrowRight,
  CheckCircle2,
  BookOpen,
  CloudUpload,
  GraduationCap,
  LayoutGrid,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  FileText,
  Check,
  Brain,
  Search,
  Upload,
  Shield,
} from "lucide-react";

const howItWorks = [
  {
    icon: GraduationCap,
    title: "Register",
    description: "Sign up with your university email in under 2 minutes.",
  },
  {
    icon: UploadCloud,
    title: "Browse or Upload",
    description: "Find past questions for your exact course, or contribute your own.",
  },
  {
    icon: BookOpen,
    title: "Study Smarter",
    description: "Filter by year and semester. View inline or download instantly.",
  },
];

const features = [
  {
    icon: ShieldCheck,
    title: "University-Verified Access",
    description: "Only students with a valid university email can join.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Moderation",
    description: "Every upload is reviewed automatically before going live.",
  },
  {
    icon: LayoutGrid,
    title: "Programme-Scoped Content",
    description: "You only see what is relevant to your programme.",
  },
  {
    icon: CloudUpload,
    title: "Community Uploads",
    description: "Students keep the question bank growing together.",
  },
  {
    icon: AlertTriangle,
    title: "Community Flagging",
    description: "Bad content gets flagged and removed without admin action.",
  },
  {
    icon: FileText,
    title: "Inline PDF Viewer",
    description: "Read past questions right in your browser, no download needed.",
  },
];

const trustBadges = [
  "University-verified access",
  "AI-moderated quality",
  "Programme-scoped content",
];

const highlightRows = [
  {
    icon: Search,
    title: "Browse by Course",
    description: "Filter past questions by year and semester instantly.",
  },
  {
    icon: Upload,
    title: "Upload and Contribute",
    description: "Add past questions for your programme in seconds.",
  },
  {
    icon: Brain,
    title: "AI Quality Control",
    description: "Every upload is reviewed before it goes live.",
  },
];

const faqs = [
  {
    question: "How do I reset my password?",
    answer:
      "Use the Forgot password link on the login page. We'll send a reset link to your university email.",
  },
  {
    question: "Will students know who the admins are?",
    answer:
      "No. Student actions are routed through the platform, and admin contact details stay private.",
  },
  {
    question: "Can I submit feedback?",
    answer:
      "Yes. Once signed in, open the Feedback page from your dashboard or sidebar and send us your ideas.",
  },
  {
    question: "How are uploaded questions checked?",
    answer:
      "Uploads go through automatic moderation before they’re published for everyone to browse.",
  },
];

export default function LandingPage() {
  return (
    <>
      <SplashWrapper />
      <div className="bg-background text-foreground">
      <LandingNavbar />

      <main>
        <section
          id="home"
          className="relative overflow-hidden pt-28 sm:pt-32 lg:pt-36"
        >
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(122,16,48,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(212,117,10,0.12),transparent_32%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.65)_0%,rgba(255,247,241,0.3)_55%,rgba(255,255,255,0.55)_100%)]" />
          </div>

          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:pb-24">
            <div className="max-w-3xl">
              <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5 text-xs">
                Built for students, by students
              </Badge>

              <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-primary sm:text-5xl lg:text-7xl">
                Your Exam Prep, Powered by the Community
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-gray-600 sm:text-lg">
                Access thousands of past questions from your programme. Upload, study, and collaborate - all in one place.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(122,16,48,0.18)] transition-all hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-[0_20px_40px_rgba(122,16,48,0.22)]"
                >
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <a
                  href="#browse"
                  className="inline-flex items-center justify-center rounded-full border border-secondary bg-transparent px-6 py-3.5 text-sm font-semibold text-secondary transition-all hover:-translate-y-0.5 hover:bg-secondary/10 hover:shadow-[0_14px_28px_rgba(212,117,10,0.16)]"
                >
                  Browse Questions
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-3 text-sm text-gray-600">
                {trustBadges.map((item) => (
                  <div
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/75 px-4 py-2 text-sm font-medium text-primary shadow-[0_12px_24px_rgba(63,39,50,0.06)] backdrop-blur-xl"
                  >
                    <Check className="h-4 w-4 text-secondary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-6 top-8 h-24 w-24 rounded-full bg-secondary/20 blur-3xl" />
              <div className="absolute -right-4 bottom-12 h-32 w-32 rounded-full bg-primary/15 blur-3xl" />

              <div className="clay-panel relative overflow-hidden p-6 sm:p-8">
                <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),var(--secondary),var(--primary))]" />
                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_35px_rgba(63,39,50,0.08)]">
                  <div className="space-y-4">
                    {highlightRows.map((row, index) => {
                      const Icon = row.icon;
                      return (
                        <div key={row.title} className={cn(
                          "flex gap-4",
                          index !== highlightRows.length - 1 ? "pb-4" : "",
                          index !== highlightRows.length - 1 ? "border-b border-slate-100" : "",
                        )}>
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-primary">{row.title}</p>
                            <p className="mt-1 text-sm leading-6 text-gray-600">{row.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <Badge variant="outline" className="rounded-full border-secondary/30 px-4 py-1.5 text-secondary">
              How It Works
            </Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              Three steps to better exam prep
            </h2>
            <p className="mt-4 text-gray-600">
              A simple workflow that helps students get from signup to study mode fast.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {howItWorks.map((step, index) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.title}
                  className="group rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-secondary/25 hover:shadow-[0_22px_55px_rgba(63,39,50,0.12)]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_14px_24px_rgba(122,16,48,0.16)]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-sm font-bold text-secondary">
                      0{index + 1}
                    </div>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-primary">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-600">{step.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="browse" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="clay-panel p-8">
              <Badge variant="secondary" className="rounded-full px-4 py-1.5 text-xs">
                Browse & Upload
              </Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary">
                Find the exact questions you need
              </h2>
              <p className="mt-4 text-gray-600">
                Search by course, filter by year, and jump straight into the right study material for your programme.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  "Search by course code or title",
                  "Filter by year and semester",
                  "Read in-browser or download instantly",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3">
                    <CheckCircle2 className="h-5 w-5 text-secondary" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/browse"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-700"
                >
                  Browse Now
                </Link>
                <Link
                  href="/upload"
                  className="inline-flex items-center justify-center rounded-full border border-secondary px-5 py-3 text-sm font-semibold text-secondary transition-all hover:-translate-y-0.5 hover:bg-secondary/10"
                >
                  Upload a Question
                </Link>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.title}
                    className="group rounded-[1.6rem] border border-white/70 bg-white/80 p-6 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-secondary/25 hover:shadow-[0_22px_55px_rgba(63,39,50,0.12)]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary transition-colors group-hover:bg-secondary group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-primary">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-gray-600">{feature.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <Badge variant="outline" className="rounded-full border-secondary/30 px-4 py-1.5 text-secondary">
              FAQ
            </Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              Questions students usually ask
            </h2>
            <p className="mt-4 text-gray-600">
              A quick guide to the most common questions about using EQB.
            </p>
          </div>

          <div className="mt-10 grid gap-4">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-[1.5rem] border border-white/70 bg-white/80 p-5 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl"
              >
                <summary className="cursor-pointer list-none text-base font-semibold text-primary">
                  <span className="flex items-center justify-between gap-4">
                    <span>{faq.question}</span>
                    <span className="text-secondary transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-7 text-gray-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="bg-primary px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(212,117,10,0.18),transparent_35%)] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] lg:p-10">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Shield,
                  title: "Course-Specific",
                  description: "Questions organised exactly by your programme and course code.",
                },
                {
                  icon: Sparkles,
                  title: "Instant Access",
                  description: "No waiting. Verified students get in immediately.",
                },
                {
                  icon: CloudUpload,
                  title: "Community-Driven",
                  description: "Your peers upload. Everyone benefits.",
                },
                {
                  icon: ShieldCheck,
                  title: "Safe and Moderated",
                  description: "AI reviews every file before it is published.",
                },
              ].map((block) => {
                const Icon = block.icon;
                return (
                  <div key={block.title} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 text-left">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-5 text-lg font-semibold text-white">{block.title}</p>
                    <p className="mt-2 text-sm leading-7 text-white/75">{block.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="clay-panel px-6 py-12 text-center sm:px-10 lg:px-16">
            <Badge variant="outline" className="rounded-full border-secondary/30 px-4 py-1.5 text-secondary">
              Join the community
            </Badge>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              Ready to start studying smarter?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">
              Join your fellow students already using EQB.
            </p>
            <div className="mt-8">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full bg-secondary px-7 py-4 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(212,117,10,0.18)] transition-all hover:-translate-y-0.5 hover:bg-secondary-700 hover:shadow-[0_20px_40px_rgba(212,117,10,0.22)]"
              >
                Create Your Free Account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#1E0E15] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr_1fr] lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <Image src="/drklogo.png" alt="EQB logo" width={160} height={48} className="h-12 w-auto object-contain" style={{ width: "auto", height: "3rem" }} priority />
              <p className="text-sm text-white/70">The student-built past questions archive.</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Quick Links</p>
            <div className="mt-4 grid gap-3 text-sm text-white/80">
              <a href="#home" className="transition-colors hover:text-secondary">Home</a>
              <a href="#how-it-works" className="transition-colors hover:text-secondary">How It Works</a>
              <Link href="/register" className="transition-colors hover:text-secondary">Register</Link>
              <Link href="/login" className="transition-colors hover:text-secondary">Log In</Link>
              <a href="#faq" className="transition-colors hover:text-secondary">FAQ</a>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Note</p>
            <p className="mt-4 max-w-sm text-sm leading-7 text-white/75">
              Built for university students. Not affiliated with any institution.
            </p>
          </div>
        </div>
        <div className="border-t border-white/10 py-4">
          <div className="mx-auto max-w-7xl px-4 text-sm text-white/65 sm:px-6 lg:px-8">
            (c) 2025 EQB. All rights reserved.
          </div>
        </div>
      </footer>
      </div>
    </>
  );
}
