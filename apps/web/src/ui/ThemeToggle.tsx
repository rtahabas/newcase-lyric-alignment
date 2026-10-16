import { Monitor, Moon, Sun } from 'lucide-react';
import { IconButton } from './IconButton';
import type { ThemeChoice } from './useTheme';
import { useTheme } from './useTheme';

const LABEL: Record<ThemeChoice, string> = {
  system: 'Theme: follows your system (click for light)',
  light: 'Theme: light (click for dark)',
  dark: 'Theme: dark (click to follow your system)',
};

/** One button cycling system → light → dark; the icon shows the current choice. */
export function ThemeToggle() {
  const { choice, cycle } = useTheme();
  const Icon = choice === 'light' ? Sun : choice === 'dark' ? Moon : Monitor;
  return (
    <IconButton label={LABEL[choice]} onClick={cycle} data-testid="theme-toggle" data-theme-choice={choice}>
      <Icon size={16} />
    </IconButton>
  );
}
