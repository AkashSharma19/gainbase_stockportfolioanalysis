import React from 'react';
import { Image, View, StyleSheet, ImageStyle } from 'react-native';
import { CategoryIcon } from './CategoryIcon';
import { CATEGORY_3D_ICONS_LIST, findBest3DIconForText } from '@/constants/Category3DIcons';
import LOCAL_3D_ICON_MAP from '@/constants/Local3DIconMap';
import { useMoneyStore } from '@/store/useMoneyStore';

// Comprehensive keyword & Lucide vector alias → 3D icon-ID resolver
const KEYWORD_TO_ID: Record<string, string> = {
  // Exact standard compound category names in Gainbase
  'shopping - electronics': 'laptop',
  'shopping - clothes': 'clothes',
  'subscriptions - ott': 'tv',
  'subscriptions - wifi': 'internet',
  'transport - fuel': 'fuel',
  'transport - cab': 'car',
  'travel/ trips': 'compass',
  'travel / trips': 'compass',
  'food & dining': 'food',
  'food and dining': 'food',
  'rent & bills': 'receipt',
  'rent and bills': 'receipt',
  'electricity bill': 'electric',
  'emi payments': 'credit_card',
  'emi payment': 'credit_card',
  'emi': 'credit_card',

  // Travel & Holiday
  holiday: 'holiday', vacation: 'holiday', beach: 'holiday',
  travel: 'travel', flight: 'travel', airplane: 'travel', plane: 'travel', compass: 'compass', trips: 'travel',
  // Food & Dining
  grocery: 'grocery', groceries: 'grocery', supermarket: 'grocery', blinkit: 'grocery', zepto: 'grocery', instamart: 'grocery',
  food: 'food', dining: 'food', eat: 'food', utensils: 'food', utensilscrossed: 'food', restaurant: 'food', swiggy: 'food', zomato: 'food',
  beverage: 'beverage', drink: 'beverage', drinks: 'beverage', cupsoda: 'beverage', wine: 'beverage',
  coffee: 'coffee', tea: 'coffee', cafe: 'coffee',
  pizza: 'pizza', burger: 'burger', cake: 'cake', cookie: 'cookie', junk: 'cookie', snacks: 'cookie', snack: 'cookie',
  broccoli: 'broccoli', carrot: 'carrot', vegetable: 'carrot', vegetables: 'carrot', apple: 'apple', fruit: 'apple', fruits: 'apple',
  // Housing & Bills
  house: 'house', home: 'house', rent: 'house',
  home_garden: 'home_garden', family: 'home_garden',
  electric: 'electric', electricity: 'electric', light: 'electric', zap: 'electric',
  water: 'water', droplets: 'water',
  gas: 'gas', fuel: 'fuel', petrol: 'fuel', diesel: 'fuel', fire: 'fire', flame: 'fire',
  internet: 'internet', wifi: 'internet', broadband: 'internet',
  wrench: 'wrench', maintenance: 'wrench', maintainance: 'wrench', repair: 'wrench',
  hammer: 'hammer', key: 'key',
  // Transport
  car: 'car', cab: 'car', uber: 'car', ola: 'car', transport: 'car', auto: 'car', taxi: 'car',
  bus: 'bus', train: 'bus', metro: 'bus',
  luggage: 'luggage',
  // Fitness & Health
  gym: 'gym', fitness: 'fitness', workout: 'gym', dumbbell: 'gym',
  biceps: 'biceps', medical: 'medical', health: 'medical', pill: 'medical', medicine: 'medical', doctor: 'medical', pharmacy: 'medical',
  trophy: 'trophy', medal: 'medal', heart: 'heart', heartpulse: 'heart',
  // Shopping & Goods
  shopping: 'shopping', shoppingbag: 'shopping', clothes: 'clothes', cloth: 'clothes', shirt: 'clothes', electronics: 'laptop',
  gift: 'gift', present: 'gift', gifts: 'gift',
  sparkles: 'sparkles', jewelry: 'sparkles', beauty: 'sparkles',
  crown: 'crown', gem: 'gem', package: 'package', tag: 'package', other: 'package', others: 'package',
  // Tech & Work
  laptop: 'laptop', phone: 'phone', cloud: 'cloud', shield: 'shield',
  bell: 'bell', books: 'books', book: 'books', bookopen: 'books',
  education: 'education', graduationcap: 'education', briefcase: 'briefcase', business: 'briefcase', freelance: 'briefcase',
  // Entertainment & Media
  headphones: 'headphones', spotify: 'headphones', music: 'musical_notes', musical_notes: 'musical_notes', musicalnotes: 'musical_notes',
  popcorn: 'popcorn', netflix: 'popcorn', movie: 'clapperboard', movies: 'clapperboard',
  tv: 'tv', television: 'tv', ott: 'tv',
  clapperboard: 'clapperboard', film_projector: 'film_projector',
  game: 'video_game', gaming: 'video_game', video_game: 'video_game',
  guitar: 'guitar', microphone: 'microphone', mic: 'microphone', camera: 'camera',
  newspaper: 'newspaper', news: 'newspaper',
  // Sectors & Industries
  bank: 'briefcase', banking: 'briefcase', nbfc: 'credit_card',
  it: 'laptop', technology: 'laptop', tech: 'laptop', software: 'laptop',
  refineries: 'fuel', refinery: 'fuel', oil: 'fuel', petroleum: 'fuel', petrochemicals: 'gas',
  'mutual fund': 'investments', mutual_fund: 'investments', trading: 'investments',
  fmcg: 'grocery', consumer: 'grocery', goods: 'package',
  automobile: 'car', vehicles: 'car', motors: 'car',
  gold: 'coin', metal: 'hammer', mining: 'wrench',
  communications: 'phone', telecom: 'phone', telecommunication: 'phone',
  'steel/ iron products': 'hammer', 'steel/ iron prducts': 'hammer', steel: 'hammer', iron: 'hammer',
  power: 'electric', energy: 'electric',
  jewellery: 'sparkles', diamond: 'gem',
  sugar: 'cookie', agriculture: 'carrot', pharma: 'medical', healthcare: 'medical',
  'real estate': 'house', realty: 'house', infrastructure: 'house',
  textiles: 'clothes', media: 'clapperboard',
  etf: 'investments', 'large cap': 'trophy', 'mid cap': 'medal', 'small cap': 'target',
  // Finance & Money
  salary: 'banknote', cash: 'banknote', income: 'banknote', banknote: 'banknote', stipend: 'banknote', payout: 'banknote',
  money: 'money', savings: 'money', refund: 'money', rotateccw: 'money',
  investments: 'investments', stocks: 'investments', invest: 'investments', trendingup: 'investments', mutual: 'investments', sip: 'investments',
  credit_card: 'credit_card', creditcard: 'credit_card', calendarrange: 'credit_card', cred: 'credit_card',
  receipt: 'receipt', bill: 'receipt', invoice: 'receipt', tax: 'receipt',
  coin: 'coin',
  // Goals
  target: 'target', bullseye: 'target', goal: 'target',
  rocket: 'rocket', star: 'star',
  umbrella: 'umbrella', insurance: 'umbrella',
  lock: 'lock', fd: 'lock',
  // Special
  users: 'users', people: 'users', person: 'users',
  loan: 'loan', handcoins: 'loan',
  // Appliances
  ac: 'ac', 'air conditioner': 'ac', aircon: 'ac', cooling: 'ac', snowflake: 'ac',
  refrigerator: 'refrigerator', fridge: 'refrigerator', freezer: 'refrigerator',
  // Peer finance
  payable: 'payable', owe: 'payable', borrowed: 'payable',
  receivable: 'receivable', lent: 'receivable', iou: 'receivable',
};

function resolveSingleKey(str: string): string | null {
  const key = (str || '').toLowerCase().trim();
  if (!key) return null;

  // 1. Direct key in local map
  if (LOCAL_3D_ICON_MAP[key]) return key;

  // 2. Exact match in KEYWORD_TO_ID map (handles "Shopping - Electronics", "EMI Payments", etc.)
  if (KEYWORD_TO_ID[key] && LOCAL_3D_ICON_MAP[KEYWORD_TO_ID[key]]) {
    return KEYWORD_TO_ID[key];
  }

  // 3. Match by CATEGORY_3D_ICONS_LIST id or name
  const byId = CATEGORY_3D_ICONS_LIST.find(
    (item) => item.id.toLowerCase() === key || item.name.toLowerCase() === key
  );
  if (byId && LOCAL_3D_ICON_MAP[byId.id]) return byId.id;

  // 4. Word-by-word token match against KEYWORD_TO_ID (reverse order for specific suffixes like "Electronics")
  const tokens = key.split(/[\s,_\-+/]+/).filter(Boolean);
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (KEYWORD_TO_ID[t] && LOCAL_3D_ICON_MAP[KEYWORD_TO_ID[t]]) {
      return KEYWORD_TO_ID[t];
    }
  }

  // 5. Smart fuzzy matcher from Category3DIcons catalog
  const best = findBest3DIconForText(key);
  if (best && LOCAL_3D_ICON_MAP[best]) {
    return best;
  }

  // 6. Fuzzy partial keyword matching
  for (const [kw, id] of Object.entries(KEYWORD_TO_ID)) {
    if (key.includes(kw) || kw.includes(key)) {
      if (LOCAL_3D_ICON_MAP[id]) return id;
    }
  }

  return null;
}

/**
 * Resolves an icon name/id to a LOCAL_3D_ICON_MAP key.
 * Prioritizes specific custom icons, then category name, and lastly generic fallbacks.
 */
function resolveLocalIconKey(name: string, customIcon?: string): string | null {
  const cleanCustom = (customIcon || '').toLowerCase().trim();
  const isGeneric = !cleanCustom || cleanCustom === 'tag' || cleanCustom === 'package' || cleanCustom === 'other' || cleanCustom === 'others';

  // 1. If customIcon is specifically chosen by the user, try it first
  if (cleanCustom && !isGeneric) {
    const fromIcon = resolveSingleKey(cleanCustom);
    if (fromIcon) return fromIcon;
  }

  // 2. Try resolving by category name (e.g., "Food & Dining", "Grocery", "Shopping - Electronics", "EMI Payments")
  if (name) {
    const fromName = resolveSingleKey(name);
    if (fromName) return fromName;
  }

  // 3. Try generic fallback if nothing matched
  if (cleanCustom) {
    const fromIcon = resolveSingleKey(cleanCustom);
    if (fromIcon) return fromIcon;
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
