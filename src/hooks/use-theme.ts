import { settings } from '@/store';
import { useEffect } from 'preact/hooks';

export function useTheme() {
  const currentTheme = settings.value.theme;

  useEffect(() => {
    const applyTheme = () => {
      const isDark =
        currentTheme === 'dark' ||
        (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('kharcha_theme', currentTheme);
    };

    applyTheme();

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (settings.value.theme === 'system') applyTheme();
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [currentTheme]);

  const setTheme = (theme: 'light' | 'dark' | 'system') => {
    settings.value = { ...settings.value, theme };
  };

  return { theme: currentTheme, setTheme };
}
