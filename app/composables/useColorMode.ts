import { useTheme } from '@squirkle-ui/ui'

/** System / light / dark, remembered on this device (see plugins/squirkle-app.client.ts) */
export function useColorMode() {
  const mode = useState<'system' | 'light' | 'dark'>('color-mode', () => 'system')
  const theme = useTheme()
  return { mode, isDark: theme.isDark }
}
