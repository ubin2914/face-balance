import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111827',
    background: '#FFFFFF',
    tint: '#7C3AED',
    icon: '#6B7280',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#7C3AED',
  },
  dark: {
    text: '#F9FAFB',
    background: '#0F0A1E',
    tint: '#A78BFA',
    icon: '#9CA3AF',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#A78BFA',
  },
};

export const AppColors = {
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  primarySurface: '#F5F3FF',
  primaryBorder: '#DDD6FE',
  background: '#FFFFFF',
  surface: '#FAFAFA',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  border: '#E5E7EB',
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
