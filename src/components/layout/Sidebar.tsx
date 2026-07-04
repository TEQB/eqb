"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  collapsed?: boolean;
  onClose?: () => void;
}

const mainNav = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25a2.25 2.25 0 01-2.25 2.25h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0120.25 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
      </svg>
    ),
  },
  {
    href: "/browse",
    label: "Browse",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    href: "/explore",
    label: "Other Past Questions",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
  {
    href: "/upload",
    label: "Upload",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  {
    href: "/contributions",
    label: "My Contributions",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
  },
  {
    href: "/feedback",
    label: "Feedback",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3h6m-3 9a9 9 0 1 0-9-9c0 1.87.57 3.61 1.54 5.06L3 21l4.44-1.48A8.94 8.94 0 0 0 12 20.25Z" />
      </svg>
    ),
  },
];

export function Sidebar({
  collapsed = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  const isNavActive = (href: string) => pathname === href;

  return (
    <TooltipProvider delay={150}>
      <nav className={cn(
        "flex h-full flex-col overflow-y-auto transition-all duration-300 ease-in-out",
        collapsed ? "overflow-x-hidden" : "",
      )}>
     <div className={cn(
  "flex pt-4 pb-3",
  collapsed ? "justify-start px-3" : "justify-start px-4",
)}>
        <Link href="/" className="flex items-center min-w-0" onClick={onClose}>
  {collapsed ? (
    <Image 
      src="/icon.png" 
      alt="EQB" 
      width={32} 
      height={32} 
      className="h-10 w-10 object-contain" 
    />
  ) : (
    <Image 
      src="/logo.png" 
      alt="EQB logo" 
      width={160} 
      height={48} 
      className="h-16 w-auto object-contain" 
      priority 
    />
  )}
</Link>
      </div>

      <div className={cn("py-3", collapsed ? "px-0" : "px-3")}>
        <div className={cn(
          "flex flex-col",
          collapsed ? "items-start px-3" : "items-stretch px-3",
          "space-y-1",
        )}>
          {mainNav.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger
                render={(
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-label={item.label}
                  />
                )}
                className={cn(
                  "flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-300 ease-in-out",
                  collapsed ? "h-11 w-11 justify-start px-3" : "px-3 py-2.5",
                  isNavActive(item.href)
                    ? collapsed
                      ? "bg-[#7A1030] text-white shadow-[0_12px_24px_rgba(122,16,48,0.18)]"
                      : "bg-secondary/15 text-primary ring-1 ring-secondary/20"
                    : collapsed
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-gray-700 hover:bg-secondary/10 hover:text-secondary",
                )}
              >
                <span className="shrink-0">
                  {item.icon}
                </span>
                <span className={cn(
                  "transition-all duration-300 ease-in-out whitespace-nowrap pointer-events-none",
                  collapsed ? "max-w-0 opacity-0 overflow-hidden" : "max-w-xs opacity-100",
                )}>
                  {item.label}
                </span>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  {item.label}
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </div>
      </div>
      </nav>
    </TooltipProvider>
  );
}
