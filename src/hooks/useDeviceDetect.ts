import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  hasTouch: boolean;
  screenWidth: number;
}

export function useDeviceDetect(): DeviceInfo {
  const checkDevice = (): DeviceInfo => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        deviceType: 'desktop',
        hasTouch: false,
        screenWidth: 1024,
      };
    }

    const width = window.innerWidth;
    const userAgent = navigator.userAgent || '';
    const mobileRegex = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;
    const tabletRegex = /iPad|Tablet/i;

    const isUaMobile = mobileRegex.test(userAgent);
    const isUaTablet = tabletRegex.test(userAgent);
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // A device is mobile if UA matches or screen width is phone-sized (< 768px)
    const isMobile = width < 768 || (isUaMobile && !isUaTablet);
    const isTablet = (width >= 768 && width < 1024) || isUaTablet;
    const isDesktop = !isMobile && !isTablet;

    const deviceType: 'mobile' | 'tablet' | 'desktop' = isMobile 
      ? 'mobile' 
      : isTablet 
        ? 'tablet' 
        : 'desktop';

    return {
      isMobile,
      isTablet,
      isDesktop,
      deviceType,
      hasTouch,
      screenWidth: width,
    };
  };

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(checkDevice);

  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(checkDevice());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return deviceInfo;
}
