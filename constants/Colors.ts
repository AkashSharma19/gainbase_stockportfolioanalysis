const tintColorLight = '#0A84FF';
const tintColorDark = '#FFFFFF';
const moneyColorDark = '#00C9A7'; // Vibrant Teal for dark theme
const moneyColorLight = '#00876E'; // Deep Emerald Teal for white theme (high contrast WCAG AA)

export default {
  light: {
    text: '#1C1C1E',
    textSecondary: '#5C5C60', // Enhanced contrast on white (5.1:1 ratio)
    background: '#F2F2F7',
    card: '#FFFFFF',
    cardSecondary: '#EFEFF4',
    border: '#D8D8DC', // Crisp, defined borders on white backgrounds
    tint: tintColorLight,
    tintMoney: moneyColorLight,
    tabIconDefault: '#68686E', // Visible inactive icons on white backgrounds
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    background: '#000000',
    card: '#1C1C1E',
    cardSecondary: '#2C2C2E',
    border: '#2C2C2E',
    tint: tintColorDark,
    tintMoney: moneyColorDark,
    tabIconDefault: '#8E8E93',
    tabIconSelected: tintColorDark,
  },
};

