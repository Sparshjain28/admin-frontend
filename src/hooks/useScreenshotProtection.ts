import { useEffect } from 'react';

export const useScreenshotProtection = () => {
  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable keyboard shortcuts for screenshots
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable Print Screen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        return false;
      }
      
      // Disable Ctrl+Shift+S (Firefox screenshot)
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        return false;
      }
      
      // Disable Windows+Shift+S (Windows Snipping Tool)
      if (e.metaKey && e.shiftKey && e.key === 's') {
        e.preventDefault();
        return false;
      }
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyDown);
    };
  }, []);
};
