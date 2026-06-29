import Link from "next/link";
import Image from "next/image";
import { BookOpen, Upload, ShieldCheck } from "lucide-react";

type AuthShellProps = {
  headline: string;
  subtext: string;
  children: React.ReactNode;
  page: "login" | "register";
};

const bullets = [
  {
    icon: BookOpen,
    text: "Access past questions by course",
  },
  {
    icon: Upload,
    text: "Upload and contribute to your programme",
  },
  {
    icon: ShieldCheck,
    text: "AI-moderated for quality content",
  },
];

export function AuthShell({ headline, subtext, children, page }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-full lg:h-full lg:grid-cols-[45%_55%]">
        <aside className="relative hidden overflow-hidden bg-primary text-white lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(212,117,10,0.14),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_55%)]" />
          <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:22px_22px]" />

          <div className="relative flex h-full flex-col justify-between px-10 py-10">
            <Link href="/" className="inline-flex items-start self-start">
  <Image
    src="/drklogo.png"
    alt="EQB logo"
    width={200}
    height={64}
    className="h-18 w-auto object-contain"
    priority
  />
</Link>

            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/65">
                Student-powered archive
              </p>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white xl:text-5xl">
                {headline}
              </h1>
              <p className="mt-5 max-w-lg text-base leading-8 text-white/80">
                {subtext}
              </p>

              <div className="mt-8 space-y-4">
                {bullets.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.text} className="flex items-start gap-3 text-sm text-white/85">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="pt-1">{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm italic text-white/75">
                Built by students, for students.
              </p>
              <p className="text-xs text-white/55">
                {page === "login"
                  ? "Welcome back to your study space."
                  : "Create your account and join the community archive."}
              </p>
            </div>
          </div>
        </aside>

        <section className="relative px-4 py-8 sm:px-6 lg:overflow-y-auto lg:px-10 lg:py-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(122,16,48,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(212,117,10,0.09),transparent_32%)]" />

          <div className="mx-auto w-full max-w-xl">
            <div className="mb-5 flex items-center gap-3 lg:hidden">
              <Link href="/" className="">
                <Image
                  src="/logo.png"
                  alt="EQB logo"
                  width={180}
                  height={44}
                  className="h-16 w-auto object-contain"
                  priority
                />
              </Link>
              <p className="text-xs text-gray-500">Built by students, for students.</p>
            </div>

            <div className="rounded-[2rem] bg-white/90 px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
              {/* <Image src="/logo.png" alt="EQB logo" width={200} height={72} className="mx-auto h-22 w-auto object-contain" /> */}
              <div className="mt-6">{children}</div>
            </div>

            <p className="mt-4 text-center text-xs text-gray-500">© 2025 EQB</p>
          </div>
        </section>
      </div>
    </div>
  );
}
