'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileDock() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 dock bg-base-200">
      {/* Dashboard */}
      <Link href="/">
        <button className={isActive('/') ? 'dock-active' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-5">
            <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path>
            <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          </svg>
          <span className="dock-label">Dashboard</span>
        </button>
      </Link>

      {/* Clients */}
      <Link href="/clients">
        <button className={isActive('/clients') ? 'dock-active' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-5">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span className="dock-label">Clients</span>
        </button>
      </Link>

      {/* Projects */}
      <Link href="/projects">
        <button className={isActive('/projects') ? 'dock-active' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-5">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
          <span className="dock-label">Projects</span>
        </button>
      </Link>

      {/* Planning */}
      <Link href="/planning">
        <button className={isActive('/planning') ? 'dock-active' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-5">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
            <line x1="16" x2="16" y1="2" y2="6"></line>
            <line x1="8" x2="8" y1="2" y2="6"></line>
            <line x1="3" x2="21" y1="10" y2="10"></line>
          </svg>
          <span className="dock-label">Planning</span>
        </button>
      </Link>

      {/* Accounting */}
      <Link href="/accounting">
        <button className={isActive('/accounting') ? 'dock-active' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-5">
            <rect width="20" height="14" x="2" y="5" rx="2"></rect>
            <line x1="2" x2="22" y1="10" y2="10"></line>
          </svg>
          <span className="dock-label">Accounting</span>
        </button>
      </Link>
    </div>
  );
}
