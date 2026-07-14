/**
 * Mobile Responsive Helper
 * Provides utilities for responsive design and mobile-first development
 */

export const BREAKPOINTS = {
  mobile: 640,    // sm (phones: < 640px)
  tablet: 768,    // md (tablets: 640px - 1023px)
  desktop: 1024,  // lg (desktops: >= 1024px)
  wide: 1280,     // xl (wide screens: >= 1280px)
};

/**
 * Check if window width is mobile
 */
export function isMobile(width: number = typeof window !== 'undefined' ? window.innerWidth : 0): boolean {
  return width < BREAKPOINTS.tablet;
}

/**
 * Check if window width is tablet
 */
export function isTablet(width: number = typeof window !== 'undefined' ? window.innerWidth : 0): boolean {
  return width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
}

/**
 * Check if window width is desktop
 */
export function isDesktop(width: number = typeof window !== 'undefined' ? window.innerWidth : 0): boolean {
  return width >= BREAKPOINTS.desktop;
}

/**
 * Get current breakpoint name
 */
export function getCurrentBreakpoint(width: number = typeof window !== 'undefined' ? window.innerWidth : 0): 'mobile' | 'tablet' | 'desktop' | 'wide' {
  if (width >= BREAKPOINTS.wide) return 'wide';
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

/**
 * Mobile-first responsive styles generator
 * @example
 * const styles = responsive({
 *   mobile: { padding: '12px' },
 *   tablet: { padding: '20px' },
 *   desktop: { padding: '32px' },
 * });
 */
export function responsive(styles: {
  mobile?: React.CSSProperties;
  tablet?: React.CSSProperties;
  desktop?: React.CSSProperties;
  wide?: React.CSSProperties;
}) {
  const width = typeof window !== 'undefined' ? window.innerWidth : BREAKPOINTS.desktop;
  const breakpoint = getCurrentBreakpoint(width);

  // Merge from mobile up
  let merged = { ...styles.mobile };
  if (breakpoint >= 'tablet') merged = { ...merged, ...styles.tablet };
  if (breakpoint >= 'desktop') merged = { ...merged, ...styles.desktop };
  if (breakpoint >= 'wide') merged = { ...merged, ...styles.wide };

  return merged;
}

/**
 * Responsive container styles
 */
export const responsiveContainer = {
  mobile: { padding: '16px', maxWidth: '100%' },
  tablet: { padding: '24px', maxWidth: '100%' },
  desktop: { padding: '32px', maxWidth: '1200px', margin: '0 auto' },
};

/**
 * Responsive grid column counts
 */
export const responsiveGrid = (baseColumns: number) => {
  return {
    mobile: { gridTemplateColumns: `repeat(1, 1fr)` },
    tablet: { gridTemplateColumns: `repeat(${Math.ceil(baseColumns / 2)}, 1fr)` },
    desktop: { gridTemplateColumns: `repeat(${baseColumns}, 1fr)` },
  };
};

/**
 * Responsive font sizes
 */
export const responsiveFontSize = {
  xs: { mobile: '12px', tablet: '12px', desktop: '12px' },
  sm: { mobile: '13px', tablet: '13px', desktop: '14px' },
  base: { mobile: '14px', tablet: '14px', desktop: '15px' },
  lg: { mobile: '16px', tablet: '18px', desktop: '20px' },
  xl: { mobile: '20px', tablet: '24px', desktop: '28px' },
  '2xl': { mobile: '24px', tablet: '28px', desktop: '32px' },
};

/**
 * Responsive padding/spacing
 */
export const responsiveSpacing = {
  xs: { mobile: '4px', tablet: '4px', desktop: '4px' },
  sm: { mobile: '8px', tablet: '8px', desktop: '8px' },
  md: { mobile: '12px', tablet: '16px', desktop: '16px' },
  lg: { mobile: '16px', tablet: '20px', desktop: '24px' },
  xl: { mobile: '20px', tablet: '24px', desktop: '32px' },
};

/**
 * Responsive button sizes
 */
export const responsiveButtonSize = {
  mobile: { padding: '10px 16px', fontSize: '14px', minHeight: '44px' }, // Touch-friendly
  tablet: { padding: '12px 20px', fontSize: '15px', minHeight: '48px' },
  desktop: { padding: '12px 24px', fontSize: '16px', minHeight: '48px' },
};

/**
 * Responsive input sizes (touch-friendly on mobile)
 */
export const responsiveInputSize = {
  mobile: { padding: '12px', fontSize: '16px', minHeight: '48px' }, // Prevents zoom on iOS
  tablet: { padding: '12px', fontSize: '15px', minHeight: '48px' },
  desktop: { padding: '12px', fontSize: '14px', minHeight: '44px' },
};

/**
 * Use window resize hook
 */
export function useWindowResize(callback: (width: number, height: number) => void) {
  if (typeof window === 'undefined') return;

  React.useEffect(() => {
    const handleResize = () => {
      callback(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [callback]);
}

/**
 * Touch-friendly adjust for form elements
 * Prevents iOS zoom when font size is < 16px
 */
export const touchFriendlyInput = {
  fontSize: '16px', // Prevents iOS zoom
  padding: '12px',
  minHeight: '48px', // Apple HIG minimum touch target
};

/**
 * Mobile menu hamburger styles
 */
export const hamburgerStyles = {
  container: { padding: '12px', cursor: 'pointer' },
  line: {
    width: '24px',
    height: '3px',
    background: '#333',
    margin: '5px 0',
    transition: 'all 0.3s',
  },
};

/**
 * Responsive viewport settings
 */
export const mobileViewportMeta = {
  name: 'viewport',
  content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

/**
 * Responsive media query strings for CSS
 */
export const mediaQueries = {
  mobile: `@media (max-width: ${BREAKPOINTS.tablet - 1}px)`,
  tablet: `@media (min-width: ${BREAKPOINTS.tablet}px) and (max-width: ${BREAKPOINTS.desktop - 1}px)`,
  desktop: `@media (min-width: ${BREAKPOINTS.desktop}px)`,
  wide: `@media (min-width: ${BREAKPOINTS.wide}px)`,
  touchDevice: `@media (hover: none) and (pointer: coarse)`,
};

// Import React for useEffect
import React from 'react';
