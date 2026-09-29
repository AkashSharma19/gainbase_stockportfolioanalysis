import { Text as RNText, TextProps } from 'react-native';
import { Typography } from '@/constants/Typography';
import { useColorScheme } from './useColorScheme';
import Colors from '@/constants/Colors';

export type ThemedTextProps = TextProps & {
  type?: 'regular' | 'medium' | 'semiBold' | 'bold';
};

export function ThemedText({ style, type = 'regular', ...rest }: ThemedTextProps) {
  const fontFamily = Typography.fontFamily[type];
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  return (
    <RNText
      style={[
        { fontFamily, color: currColors.text },
        style,
      ]}
      {...rest}
    />
  );
}
