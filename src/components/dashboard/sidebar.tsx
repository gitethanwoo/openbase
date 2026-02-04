"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  MessageSquare,
  BarChart3,
  Database,
  Settings,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/actions";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/chat-logs", label: "Chat Logs", icon: MessageSquare },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/sources", label: "Sources", icon: Database },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-sidebar transition-transform lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo / Brand */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold">FaithBase</span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 hover:bg-sidebar-accent lg:hidden"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close sidebar</span>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Sign out */}
          <div className="border-t p-4">
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
