/**
 * Configuration for navbar visibility across different routes
 */

/**
 * Determines if the navbar should be hidden for a given pathname
 * @param pathname - The current route pathname
 * @returns true if navbar should be hidden, false otherwise
 */
export function shouldHideNavbar(pathname: string): boolean {
  // List of routes where navbar should be hidden
  const hiddenNavbarRoutes = [
    '/',
    '/clients',
    '/projects',
    '/planning'
  ];

  return hiddenNavbarRoutes.includes(pathname);
}

/**
 * List of all routes where navbar is hidden
 * Useful for documentation or debugging purposes
 */
export const HIDDEN_NAVBAR_ROUTES = [
  '/',
  '/clients',
  '/projects',
  '/planning'
] as const;
