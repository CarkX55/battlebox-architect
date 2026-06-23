import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const listener = (e) => setIsMobile(e.matches);
    
    // Set initial value
    setIsMobile(media.matches);
    
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  return isMobile;
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    const listener = (e) => setIsTablet(e.matches);
    
    setIsTablet(media.matches);
    
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  return isTablet;
}

export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)');
    const listener = (e) => setIsTouch(e.matches);
    
    setIsTouch(media.matches || ('ontouchstart' in window) || navigator.maxTouchPoints > 0);
    
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  return isTouch;
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState('desktop');

  useEffect(() => {
    const mobileMedia = window.matchMedia('(max-width: 767px)');
    const tabletMedia = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    
    const updateBreakpoint = () => {
      if (mobileMedia.matches) {
        setBreakpoint('mobile');
      } else if (tabletMedia.matches) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    updateBreakpoint();

    mobileMedia.addEventListener('change', updateBreakpoint);
    tabletMedia.addEventListener('change', updateBreakpoint);
    
    return () => {
      mobileMedia.removeEventListener('change', updateBreakpoint);
      tabletMedia.removeEventListener('change', updateBreakpoint);
    };
  }, []);

  return breakpoint;
}
