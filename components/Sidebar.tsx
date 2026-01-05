'use client';

import { ReactNode, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

interface SidebarProps {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
}

export default function Sidebar({ children, title = "New Mood", action }: SidebarProps) {
  const { user, logout, updateSidebarPreference, loading } = useAuth();
  const pathname = usePathname();
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isLightTheme, setIsLightTheme] = useState(false);

  // Use user's preference directly, no local state
  const isOpen = user?.sidebarOpen || false;

  const toggleSidebar = () => {
    const newState = !isOpen;
    updateSidebarPreference(newState);
  };

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'mooddark';
    setIsLightTheme(savedTheme === 'moodlight');
  }, []);

  // Debounced close sidebar on mobile when route changes
  useEffect(() => {
    if (isOpen && window.innerWidth < 1024) {
      // Clear any pending updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      // Debounce the preference update by 300ms
      updateTimeoutRef.current = setTimeout(() => {
        updateSidebarPreference(false);
      }, 300);
    }

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [pathname]);

  // Render children immediately even while loading auth
  // Show placeholder avatar until user loads
  if (loading) {
    return (
      <div className="drawer lg:drawer-open">
        <input
          id="my-drawer-4"
          type="checkbox"
          className="drawer-toggle"
          checked={false}
          readOnly
        />
        <div className="drawer-content">
          <nav className="navbar w-full bg-base-300">
            <div className="flex-none lg:hidden">
              <label htmlFor="my-drawer-4" className="btn btn-square btn-ghost">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-6 h-6 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </label>
            </div>
            <div className="flex-1 px-4">{title}</div>
            {action && <div className="flex-none px-4">{action}</div>}
          </nav>
          {children}
        </div>
        <div className="drawer-side is-drawer-close:overflow-visible z-50">
          <label htmlFor="my-drawer-4" aria-label="close sidebar" className="drawer-overlay"></label>
          <div className="flex min-h-full flex-col items-start bg-base-200 is-drawer-close:w-14 is-drawer-open:w-64">
            <div className="skeleton h-16 w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="drawer lg:drawer-open">
  <input
    id="my-drawer-4"
    type="checkbox"
    className="drawer-toggle"
    checked={isOpen}
    onChange={toggleSidebar}
  />
  <div className="drawer-content">
    {/* Navbar */}
    <nav className="navbar w-full bg-base-300">
      <div className="flex-none lg:hidden">
        <label htmlFor="my-drawer-4" className="btn btn-square btn-ghost">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-6 h-6 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </label>
      </div>
      <div className="flex-1 px-4">{title}</div>
      {action && <div className="flex-none px-4">{action}</div>}
    </nav>
    {/* Page content here */}
    {children}
  </div>

  <div className="drawer-side is-drawer-close:overflow-visible z-50">
    <label htmlFor="my-drawer-4" aria-label="close sidebar" className="drawer-overlay"></label>
    <div className="flex min-h-full flex-col items-start bg-base-200 is-drawer-close:w-14 is-drawer-open:w-64">
      {/* Logo section */}
      <Link href="/" className="w-full p-4 flex justify-center items-center text-base-content hover:opacity-80 transition-opacity">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 547.3014287 266.0121941" className="is-drawer-open:hidden" width="40" height="40">
          <path fill="currentColor" d="M423.4285601,212.7344941c0,17.2922054,4.6824499,38.3267196,16.3657557,43.000042v2.8021679h-131.3276595v-2.8021679c11.6833058-4.6733223,16.3566281-23.8366821,16.3566281-43.000042V83.277989c0-35.9900585-13.0889536-48.138871-27.1089205-48.138871-8.4156312,0-16.3566281,2.3366612-23.8412459,8.4110674v169.1843086c0,17.2922054,4.6824499,38.3267196,16.3657557,43.000042v2.8021679h-131.8022938v-2.8021679c11.6833058-4.6733223,16.3566281-23.8366821,16.3566281-43.000042V83.277989c0-35.9900585-13.079826-48.138871-27.0997929-48.138871-7.9501245,0-16.3566281,2.8021679-23.8412459,8.4110674v169.1843086c0,17.2922054,4.6733223,38.3267196,16.3566281,43.000042v2.8021679H8.4156312v-2.8021679c11.6833058-4.6733223,16.3566281-23.8366821,16.3566281-43.000042v-122.4465215c0-21.9655277-7.4754902-35.519988-24.7722594-49.5399549v-2.8067317C21.5045848,32.3323864,83.6634228,13.1735903,116.8421858,3.8269457h2.8021679l.940141,36.9210719C139.7432907,15.040181,168.7233657.0846368,201.436622.0846368c43.000042,0,63.5644857,21.9655277,71.0399759,37.8566491C291.6353939,14.1091676,319.6753279.0846368,351.4575707.0846368c60.2876835,0,71.9709894,54.2132773,71.9709894,101.8866416v110.7632157ZM449.7118033,216.9423097c0-26.63885,21.9609639-48.6043777,49.0698844-48.6043777,26.6434138,0,48.6043777,21.9655277,48.6043777,48.6043777,0,27.1043567-21.9609639,49.0698844-48.6043777,49.0698844-27.1089205,0-49.0698844-23.3666116-49.0698844-49.0698844Z"/>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000.6292135 266.0121941" className="is-drawer-close:hidden" height="40">
          <path fill="currentColor" d="M298.8660113,228.2726869c0,12.2052524,3.3049852,27.051916,11.5513421,30.3504587v1.9778372h-92.694205v-1.9778372c8.2463569-3.2985427,11.5448996-16.8245007,11.5448996-30.3504587v-91.3734994c0-25.4026446-9.2384967-33.9775672-19.1341249-33.9775672-5.9399539,0-11.5448996,1.6492714-16.827722,5.9367327v119.414334c0,12.2052524,3.3049852,27.051916,11.5513421,30.3504587v1.9778372h-93.0292133v-1.9778372c8.2463569-3.2985427,11.5448996-16.8245007,11.5448996-30.3504587v-91.3734994c0-25.4026446-9.2320542-33.9775672-19.1276824-33.9775672-5.6113881,0-11.5448996,1.9778372-16.827722,5.9367327v119.414334c0,12.2052524,3.2985427,27.051916,11.5448996,30.3504587v1.9778372H5.9399539v-1.9778372c8.2463569-3.2985427,11.5448996-16.8245007,11.5448996-30.3504587v-86.4256853c0-15.5037951-5.2763799-25.0708576-17.4848535-34.9664858v-1.9810584c15.1784506-3.9588955,59.051646-17.4816323,82.470011-24.0787178h1.9778372l.663574,26.0597762c13.5227367-18.1452063,33.9775672-28.7011873,57.0673664-28.7011873,30.3504587,0,44.8653353,15.5037951,50.1417152,26.7201289,13.5227367-16.8212795,33.3139932-26.7201289,55.7466608-26.7201289,42.5524899,0,50.7988467,38.2650285,50.7988467,71.91403v78.1793285ZM915.4748422,0v228.2726869c0,12.2052524,3.2985427,27.051916,11.5448996,30.3504587v1.9778372h-78.8429025l-2.3064029-29.0297531c-11.8799078,19.1341249-28.7011873,31.3393773-53.7688237,31.3393773-35.9554044,0-64.6565917-22.7612334-64.6565917-86.4289065,0-57.0673664,37.9332415-97.9705849,81.4778712-97.9705849,16.1641479,0,26.3883419,2.6381899,36.6189784,11.5448996v-29.0297531c0-15.1720081-5.2828224-25.0708576-17.8134193-34.6346988v-2.3096242c15.5005739-3.9588955,62.6723121-17.4848535,86.0971195-24.081939h1.6492714ZM845.5418706,220.8754416v-123.0353731c-3.9621168-3.2985427-7.5892253-4.9478141-13.2006134-4.9478141-22.7612334,0-30.3440162,24.5442424-30.3440162,75.3430891,0,51.4624207,8.2463569,64.1849977,24.081939,64.1849977,7.254217,0,14.1798683-4.2874613,19.4626907-11.5448996ZM931.0591682,231.2426639c0-18.8023379,15.5005739-34.306133,34.6346988-34.306133,18.8055591,0,34.306133,15.5037951,34.306133,34.306133,0,19.1309037-15.5005739,34.6346988-34.306133,34.6346988-19.1341249,0-34.6346988-16.4927137-34.6346988-34.6346988ZM519.7073133,170.2164019c0-46.5146066,39.2539471-92.0370735,95.664182-92.0370735,59.3802118,0,95.3356162,42.5557111,95.3356162,92.3656392,0,47.1717382-38.5968156,92.3656392-95.3356162,92.3656392-60.0373434,0-95.664182-42.2239241-95.664182-92.694205ZM636.4834574,170.2215706c-.3285658-64.9444758-5.6049457-86.3727918-21.111962-86.3727918-15.1720081,0-21.111962,21.428316-21.4405278,86.3727918-.3285658,65.2647274,5.9335115,87.0228073,21.4405278,87.0228073,15.8355821,0,21.4405278-21.7580799,21.111962-87.0228073ZM317.0150946,170.2164019c0-46.5146066,39.2539471-92.0370735,95.664182-92.0370735,59.3802118,0,95.3356162,42.5557111,95.3356162,92.3656392,0,47.1717382-38.5968156,92.3656392-95.3356162,92.3656392-60.0373434,0-95.664182-42.2239241-95.664182-92.694205ZM433.7912386,170.2215706c-.3285658-64.9444758-5.6049457-86.3727918-21.111962-86.3727918-15.1720081,0-21.111962,21.428316-21.4405278,86.3727918-.3285658,65.2647274,5.9335115,87.0228073,21.4405278,87.0228073,15.8355821,0,21.4405278-21.7580799,21.111962-87.0228073Z"/>
        </svg>
      </Link>

      {/* Sidebar content here */}
      <ul className="menu w-full flex-1">
        {/* List item */}
        <li>
          <Link href="/" className="is-drawer-close:tooltip is-drawer-close:tooltip-right" data-tip="Dashboard">
            {/* Home icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="my-1.5 inline-block size-4"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
            <span className="is-drawer-close:hidden">Dashboard</span>
          </Link>
        </li>

        {/* Clients */}
        <li>
          <Link href="/clients" className="is-drawer-close:tooltip is-drawer-close:tooltip-right" data-tip="Clients">
            {/* Clients icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="my-1.5 inline-block size-4"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span className="is-drawer-close:hidden">Clients</span>
          </Link>
        </li>

        {/* Projects */}
        <li>
          <Link href="/projects" className="is-drawer-close:tooltip is-drawer-close:tooltip-right" data-tip="Projects">
            {/* Projects icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="my-1.5 inline-block size-4"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
            <span className="is-drawer-close:hidden">Projects</span>
          </Link>
        </li>

        {/* Planning */}
        <li>
          <Link href="/planning" className="is-drawer-close:tooltip is-drawer-close:tooltip-right" data-tip="Planning">
            {/* Planning icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="my-1.5 inline-block size-4"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
            <span className="is-drawer-close:hidden">Planning</span>
          </Link>
        </li>

        {/* Accounting */}
        <li>
          <Link href="/accounting" className="is-drawer-close:tooltip is-drawer-close:tooltip-right" data-tip="Accounting">
            {/* Accounting icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="my-1.5 inline-block size-4"><rect width="20" height="14" x="2" y="5" rx="2"></rect><line x1="2" x2="22" y1="10" y2="10"></line></svg>
            <span className="is-drawer-close:hidden">Accounting</span>
          </Link>
        </li>
      </ul>

      {/* Bottom section with user avatar dropdown */}
      {user && (
        <div className="w-full p-2">
          <div className="dropdown dropdown-top w-full">
            <div tabIndex={0} role="button" className="btn btn-ghost w-full justify-start gap-3 is-drawer-close:btn-square is-drawer-close:justify-center">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content mask mask-squircle w-8 flex items-center justify-center">
                  <span className="text-sm">{user.name.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              <span className="is-drawer-close:hidden text-sm font-semibold">{user.name}</span>
            </div>
            <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow-lg border border-base-300 mb-2 is-drawer-close:left-14">
              <li>
                <label htmlFor="my-drawer-4" aria-label="toggle sidebar">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                    <path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"></path>
                    <path d="M9 4v16"></path>
                    <path d="M14 10l2 2l-2 2"></path>
                  </svg>
                  Toggle Menu
                </label>
              </li>
              <li>
                <button
                  onClick={() => {
                    const newTheme = isLightTheme ? 'mooddark' : 'moodlight';
                    setIsLightTheme(!isLightTheme);
                    document.documentElement.setAttribute('data-theme', newTheme);
                    localStorage.setItem('theme', newTheme);
                  }}
                >
                  {isLightTheme ? (
                    // Sun icon for light theme
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                      <circle cx="12" cy="12" r="4"></circle>
                      <path d="M12 2v2"></path>
                      <path d="M12 20v2"></path>
                      <path d="m4.93 4.93 1.41 1.41"></path>
                      <path d="m17.66 17.66 1.41 1.41"></path>
                      <path d="M2 12h2"></path>
                      <path d="M20 12h2"></path>
                      <path d="m6.34 17.66-1.41 1.41"></path>
                      <path d="m19.07 4.93-1.41 1.41"></path>
                    </svg>
                  ) : (
                    // Moon icon for dark theme
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                    </svg>
                  )}
                  Toggle Theme
                </button>
              </li>
              <li>
                <Link href="/settings">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4"><path d="M20 7h-9"></path><path d="M14 17H5"></path><circle cx="17" cy="17" r="3"></circle><circle cx="7" cy="7" r="3"></circle></svg>
                  Settings
                </Link>
              </li>
              <li>
                <button onClick={logout}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" x2="9" y1="12" y2="12"></line></svg>
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  </div>
</div>
  );
}
