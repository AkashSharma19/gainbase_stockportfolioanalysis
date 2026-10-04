import React from 'react';
import { Image, View, StyleSheet, ImageStyle } from 'react-native';
import { CategoryIcon } from './CategoryIcon';
import { CATEGORY_3D_ICONS_LIST } from '@/constants/Category3DIcons';
import LOCAL_3D_ICON_MAP from '@/constants/Local3DIconMap';
import { useMoneyStore } from '@/store/useMoneyStore';

// Legacy keyword → icon-ID resolver (still useful for auto-matching categories by name)
const KEYWORD_TO_ID: Record<string, string> = {
  // Travel & Holiday
  holiday: 'holiday', vacation: 'holiday', beach: 'holiday',
  travel: 'travel', flight: 'travel', airplane: 'travel',
  // Food
  grocery: 'grocery', groceries: 'grocery',
  food: 'food', dining: 'food', eat: 'food',
  beverage: 'beverage', drink: 'beverage',
  coffee: 'coffee', tea: 'coffee', cafe: 'coffee',
  pizza: 'pizza', burger: 'burger',
  // Housing
  house: 'house', home: 'house', rent: 'house',
  home_garden: 'home_garden', family: 'home_garden',
  electric: 'electric', electricity: 'electric', light: 'electric',
  water: 'water',
  gas: 'gas', fuel: 'fuel', fire: 'fire',
  internet: 'internet', wifi: 'internet',
  wrench: 'wrench', maintenance: 'wrench',
  hammer: 'hammer', key: 'key',
  // Transport
  car: 'car', cab: 'car', uber: 'car', transport: 'car',
  bus: 'bus', train: 'bus',
  luggage: 'luggage', compass: 'compass',
  // Fitness
  gym: 'gym', fitness: 'fitness', workout: 'gym',
  biceps: 'biceps', medical: 'medical', health: 'medical',
  trophy: 'trophy', medal: 'medal', heart: 'heart',
  // Shopping
  shopping: 'shopping', clothes: 'clothes', cloth: 'clothes',
  gift: 'gift', present: 'gift',
  sparkles: 'sparkles', jewelry: 'sparkles', beauty: 'sparkles',
  crown: 'crown', gem: 'gem', package: 'package',
  // Tech
  laptop: 'laptop', phone: 'phone', cloud: 'cloud', shield: 'shield',
  bell: 'bell', books: 'books', book: 'books',
  education: 'education', briefcase: 'briefcase', business: 'briefcase',
  // Entertainment
  headphones: 'headphones', spotify: 'headphones', music: 'musical_notes',
  popcorn: 'popcorn', netflix: 'popcorn', movie: 'clapperboard',
  tv: 'tv', television: 'tv', ott: 'tv',
  clapperboard: 'clapperboard', film_projector: 'film_projector',
  game: 'video_game', gaming: 'video_game', video_game: 'video_game',
  guitar: 'guitar', microphone: 'microphone', camera: 'camera',
  newspaper: 'newspaper', news: 'newspaper',
  // Sectors & Industries
  bank: 'briefcase', banking: 'briefcase', nbfc: 'credit_card',
  it: 'laptop', technology: 'laptop', tech: 'laptop', software: 'laptop',
  refineries: 'fuel', refinery: 'fuel', oil: 'fuel', petroleum: 'fuel', petrochemicals: 'gas',
  'mutual fund': 'investments', mutual_fund: 'investments', trading: 'investments',
  fmcg: 'grocery', consumer: 'grocery', goods: 'package',
  automobile: 'car', auto: 'car', vehicles: 'car', motors: 'car',
  gold: 'coin', metal: 'hammer', mining: 'wrench',
  communications: 'phone', telecom: 'phone', telecommunication: 'phone',
  'steel/ iron products': 'hammer', 'steel/ iron prducts': 'hammer', steel: 'hammer', iron: 'hammer',
  power: 'electric', energy: 'electric',
  jewellery: 'sparkles', diamond: 'gem',
  sugar: 'cookie', agriculture: 'carrot', pharma: 'medical', healthcare: 'medical',
  'real estate': 'house', realty: 'house', infrastructure: 'house',
  textiles: 'clothes', media: 'clapperboard',
  etf: 'investments', 'large cap': 'trophy', 'mid cap': 'medal', 'small cap': 'target',
  // Finance
  salary: 'banknote', cash: 'banknote', income: 'banknote', banknote: 'banknote',
  money: 'money', savings: 'money',
  investments: 'investments', stocks: 'investments', invest: 'investments',
  credit_card: 'credit_card', emi: 'credit_card',
  receipt: 'receipt', bill: 'receipt',
  coin: 'coin',
  // Goals
  target: 'target', bullseye: 'target', goal: 'target',
  rocket: 'rocket', star: 'star',
  umbrella: 'umbrella', insurance: 'umbrella',
  lock: 'lock', fd: 'lock',
  // Special
  users: 'users', people: 'users', person: 'users',
  loan: 'loan',
  // Appliances
  ac: 'ac', 'air conditioner': 'ac', aircon: 'ac', cooling: 'ac', snowflake: 'ac',
  refrigerator: 'refrigerator', fridge: 'refrigerator', freezer: 'refrigerator',
  // Peer finance
  payable: 'payable', owe: 'payable', borrowed: 'payable',
  receivable: 'receivable', lent: 'receivable', iou: 'receivable',
};

/**
 * Resolves an icon name/id to a LOCAL_3D_ICON_MAP key.
 * Returns null if nothing matches (falls back to vector icon).
 */
function resolveLocalIconKey(name: string, customIcon?: string): string | null {
  const key = (customIcon || name || '').toLowerCase().trim();
  if (!key) return null;

  // 1. Direct key in local map
  if (LOCAL_3D_ICON_MAP[key]) return key;

  // 2. Match by CATEGORY_3D_ICONS_LIST id
  const byId = CATEGORY_3D_ICONS_LIST.find(
    (item) => item.id.toLowerCase() === key || item.name.toLowerCase() === key
  );
  if (byId && LOCAL_3D_ICON_MAP[byId.id]) return byId.id;

  // 3. Keyword → id map
  if (KEYWORD_TO_ID[key] && LOCAL_3D_ICON_MAP[KEYWORD_TO_ID[key]]) {
    return KEYWORD_TO_ID[key];
  }

  // 4. Fuzzy partial keyword matching
  for (const [kw, id] of Object.entries(KEYWORD_TO_ID)) {
    if (key.includes(kw) || kw.includes(key)) {
      if (LOCAL_3D_ICON_MAP[id]) return id;
    }
  }

  return null;
}

export function Category3DIcon({
  name,
  icon,
  size = 36,
  style,
}: {
  name: string;
  icon?: string;
  size?: number;
  style?: ImageStyle;
}) {
  const customMeta = useMoneyStore((state) => state.categoryMetadata?.[name]);
  const effectiveIcon = icon || customMeta?.icon;

  const localKey = resolveLocalIconKey(name, effectiveIcon);
  const localSource = localKey ? LOCAL_3D_ICON_MAP[localKey] : null;

  if (!localSource) {
    return (
      <View style={[styles.fallbackContainer, { width: size, height: size }]}>
        <CategoryIcon name={name} size={size * 0.65} />
      </View>
    );
  }

  return (
    <Image
      source={localSource}
      style={[{ width: size, height: size, resizeMode: 'contain' }, style]}
    />
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Keep getCategory3DUrl exported for any legacy code that still uses it
// (returns null now since we're offline — callers should use Category3DIcon component directly)
export function getCategory3DUrl(_name: string, _customIcon?: string): string | null {
  return null;
}
