export interface IconDefinition {
  name: string;
  category: string;
  keywords: string[];
}

export const CATEGORY_ICONS_LIST: IconDefinition[] = [
  // 1. Food & Dining (20 icons)
  { name: 'Utensils', category: 'Food & Drink', keywords: ['food', 'dining', 'restaurant', 'eat', 'dinner', 'lunch', 'meal', 'fork', 'knife'] },
  { name: 'UtensilsCrossed', category: 'Food & Drink', keywords: ['food', 'dining', 'restaurant', 'cooking', 'chef', 'kitchen'] },
  { name: 'Coffee', category: 'Food & Drink', keywords: ['coffee', 'tea', 'cafe', 'latte', 'espresso', 'cappuccino', 'morning', 'drink', 'beverage', 'starbucks'] },
  { name: 'CupSoda', category: 'Food & Drink', keywords: ['soda', 'drink', 'cold', 'beverage', 'juice', 'cola', 'bar'] },
  { name: 'Pizza', category: 'Food & Drink', keywords: ['pizza', 'fast food', 'junk', 'snack', 'delivery', 'zomato', 'swiggy'] },
  { name: 'Burger', category: 'Food & Drink', keywords: ['burger', 'fast food', 'mcdonalds', 'snack', 'junk', 'eat'] },
  { name: 'Beer', category: 'Food & Drink', keywords: ['beer', 'alcohol', 'bar', 'drinks', 'party', 'pub', 'club'] },
  { name: 'Wine', category: 'Food & Drink', keywords: ['wine', 'cocktail', 'liquor', 'alcohol', 'bar', 'celebrate', 'champagne'] },
  { name: 'Cake', category: 'Food & Drink', keywords: ['cake', 'bakery', 'birthday', 'sweet', 'dessert', 'pastry'] },
  { name: 'IceCream', category: 'Food & Drink', keywords: ['ice cream', 'dessert', 'sweet', 'summer', 'cold', 'gelato'] },
  { name: 'Apple', category: 'Food & Drink', keywords: ['apple', 'fruit', 'grocery', 'healthy', 'diet', 'organic'] },
  { name: 'Banana', category: 'Food & Drink', keywords: ['banana', 'fruit', 'grocery', 'produce'] },
  { name: 'Carrot', category: 'Food & Drink', keywords: ['carrot', 'vegetable', 'grocery', 'veggie', 'salad', 'organic'] },
  { name: 'Beef', category: 'Food & Drink', keywords: ['meat', 'beef', 'chicken', 'protein', 'butcher', 'grocery'] },
  { name: 'Cookie', category: 'Food & Drink', keywords: ['cookie', 'biscuit', 'junk', 'snack', 'sweet', 'chocolate'] },
  { name: 'Soup', category: 'Food & Drink', keywords: ['soup', 'bowl', 'ramen', 'noodles', 'hot', 'meal'] },
  { name: 'Sandwich', category: 'Food & Drink', keywords: ['sandwich', 'bread', 'breakfast', 'sub', 'toast'] },
  { name: 'Popcorn', category: 'Food & Drink', keywords: ['popcorn', 'snack', 'cinema', 'movie', 'theatre'] },
  { name: 'Candy', category: 'Food & Drink', keywords: ['candy', 'sweet', 'chocolate', 'sugar'] },
  { name: 'ChefHat', category: 'Food & Drink', keywords: ['cook', 'baking', 'chef', 'kitchen', 'recipe'] },

  // 2. Transport & Travel (18 icons)
  { name: 'Car', category: 'Transport', keywords: ['car', 'cab', 'uber', 'ola', 'drive', 'taxi', 'auto', 'ride', 'vehicle'] },
  { name: 'Fuel', category: 'Transport', keywords: ['fuel', 'petrol', 'diesel', 'gas', 'cng', 'station', 'pump', 'oil'] },
  { name: 'Bus', category: 'Transport', keywords: ['bus', 'transit', 'public transport', 'commute', 'shuttle'] },
  { name: 'Train', category: 'Transport', keywords: ['train', 'metro', 'subway', 'railway', 'irctc', 'commute'] },
  { name: 'Plane', category: 'Transport', keywords: ['plane', 'flight', 'travel', 'airport', 'airline', 'air', 'vacation', 'trip'] },
  { name: 'Bike', category: 'Transport', keywords: ['bike', 'bicycle', 'motorcycle', 'scooter', 'cycling', 'ride'] },
  { name: 'Ship', category: 'Transport', keywords: ['ship', 'boat', 'cruise', 'ferry', 'sea', 'water'] },
  { name: 'Truck', category: 'Transport', keywords: ['truck', 'mover', 'cargo', 'delivery', 'transport', 'shipping'] },
  { name: 'Navigation', category: 'Transport', keywords: ['navigation', 'gps', 'map', 'directions', 'drive', 'route'] },
  { name: 'Compass', category: 'Transport', keywords: ['compass', 'trip', 'travel', 'adventure', 'explore', 'tour'] },
  { name: 'MapPin', category: 'Transport', keywords: ['location', 'place', 'visit', 'destination', 'stay'] },
  { name: 'Ticket', category: 'Transport', keywords: ['ticket', 'pass', 'booking', 'flight ticket', 'train ticket'] },
  { name: 'Luggage', category: 'Transport', keywords: ['luggage', 'baggage', 'suitcase', 'travel', 'trip', 'holiday'] },
  { name: 'Hotel', category: 'Transport', keywords: ['hotel', 'stay', 'motel', 'resort', 'airbnb', 'vacation', 'lodging'] },
  { name: 'Globe', category: 'Transport', keywords: ['globe', 'world', 'international', 'foreign', 'travel', 'overseas'] },
  { name: 'ParkingSquare', category: 'Transport', keywords: ['parking', 'park', 'garage', 'vehicle', 'valet', 'toll'] },
  { name: 'Gauge', category: 'Transport', keywords: ['speed', 'mileage', 'service', 'maintenance', 'meter'] },
  { name: 'Milestone', category: 'Transport', keywords: ['toll', 'highway', 'road', 'trip', 'distance'] },

  // 3. Shopping & E-Commerce (16 icons)
  { name: 'ShoppingBag', category: 'Shopping', keywords: ['shopping', 'clothes', 'mall', 'store', 'buy', 'retail', 'myntra', 'amazon'] },
  { name: 'ShoppingCart', category: 'Shopping', keywords: ['cart', 'supermarket', 'mart', 'groceries', 'blinkit', 'zepto', 'instamart'] },
  { name: 'Shirt', category: 'Shopping', keywords: ['shirt', 'clothes', 'clothing', 'fashion', 'apparel', 'outfit', 'wear', 'tshirt'] },
  { name: 'Tag', category: 'Shopping', keywords: ['tag', 'discount', 'offer', 'sale', 'deal', 'coupon', 'promo'] },
  { name: 'Watch', category: 'Shopping', keywords: ['watch', 'accessory', 'jewelry', 'time', 'luxury', 'wearable'] },
  { name: 'Glasses', category: 'Shopping', keywords: ['glasses', 'spectacles', 'sunglasses', 'lenskart', 'eyewear', 'optical'] },
  { name: 'Sparkles', category: 'Shopping', keywords: ['sparkle', 'beauty', 'cosmetics', 'makeup', 'salon', 'jewelry', 'gold', 'luxury'] },
  { name: 'Package', category: 'Shopping', keywords: ['package', 'parcel', 'courier', 'delivery', 'order', 'box'] },
  { name: 'Box', category: 'Shopping', keywords: ['box', 'package', 'goods', 'shipping', 'items'] },
  { name: 'Store', category: 'Shopping', keywords: ['store', 'shop', 'outlet', 'market', 'boutique', 'vendor'] },
  { name: 'Gift', category: 'Shopping', keywords: ['gift', 'present', 'birthday', 'festival', 'surprise', 'celebration'] },
  { name: 'BadgePercent', category: 'Shopping', keywords: ['discount', 'percent', 'sale', 'cashback', 'coupon'] },
  { name: 'QrCode', category: 'Shopping', keywords: ['qr', 'upi', 'scan', 'pay', 'payment', 'phonepe', 'gpay', 'paytm'] },
  { name: 'Receipt', category: 'Shopping', keywords: ['receipt', 'bill', 'invoice', 'slip', 'proof', 'expense'] },
  { name: 'ScanLine', category: 'Shopping', keywords: ['scan', 'barcode', 'checkout', 'pos'] },
  { name: 'Crown', category: 'Shopping', keywords: ['vip', 'premium', 'luxury', 'membership', 'gold'] },

  // 4. Bills, Utilities & Housing (16 icons)
  { name: 'Home', category: 'Housing & Bills', keywords: ['home', 'house', 'rent', 'mortgage', 'residence', 'flat', 'apartment'] },
  { name: 'Building', category: 'Housing & Bills', keywords: ['building', 'society', 'maintenance', 'condo', 'realty', 'estate'] },
  { name: 'Building2', category: 'Housing & Bills', keywords: ['office', 'property', 'complex', 'rent', 'lease'] },
  { name: 'Zap', category: 'Housing & Bills', keywords: ['electricity', 'power', 'electric', 'bill', 'energy', 'light', 'current', 'eb'] },
  { name: 'Wifi', category: 'Housing & Bills', keywords: ['wifi', 'internet', 'broadband', 'fiber', 'network', 'airtel', 'jio'] },
  { name: 'Tv', category: 'Housing & Bills', keywords: ['tv', 'television', 'cable', 'dth', 'tata play', 'dish'] },
  { name: 'Droplet', category: 'Housing & Bills', keywords: ['water', 'water bill', 'aqua', 'filter', 'tanker'] },
  { name: 'Flame', category: 'Housing & Bills', keywords: ['gas', 'cylinder', 'lpg', 'heating', 'stove', 'kitchen gas'] },
  { name: 'Trash2', category: 'Housing & Bills', keywords: ['garbage', 'trash', 'waste', 'cleaning', 'maid'] },
  { name: 'ShieldAlert', category: 'Housing & Bills', keywords: ['security', 'guard', 'alarm', 'safety', 'insurance'] },
  { name: 'Wrench', category: 'Housing & Bills', keywords: ['repair', 'maintenance', 'fix', 'tools', 'plumbing', 'mechanic', 'urban company'] },
  { name: 'Hammer', category: 'Housing & Bills', keywords: ['construction', 'renovation', 'tools', 'diy', 'carpenter'] },
  { name: 'Key', category: 'Housing & Bills', keywords: ['key', 'rent', 'deposit', 'lease', 'tenant', 'brokerage'] },
  { name: 'Bed', category: 'Housing & Bills', keywords: ['bed', 'hotel', 'furniture', 'room', 'hostel', 'pg'] },
  { name: 'Armchair', category: 'Housing & Bills', keywords: ['furniture', 'decor', 'interior', 'living room', 'sofa'] },
  { name: 'Lamp', category: 'Housing & Bills', keywords: ['lamp', 'lighting', 'decor', 'fixtures'] },

  // 5. Health & Wellness (14 icons)
  { name: 'Pill', category: 'Health', keywords: ['medicine', 'medical', 'pharmacy', 'chemist', 'drugs', 'pharma', 'apollo', '1mg'] },
  { name: 'Heart', category: 'Health', keywords: ['heart', 'care', 'health', 'charity', 'donation', 'wellness'] },
  { name: 'HeartPulse', category: 'Health', keywords: ['health', 'pulse', 'hospital', 'clinic', 'checkup', 'cardio'] },
  { name: 'Activity', category: 'Health', keywords: ['fitness', 'workout', 'track', 'exercise', 'movement', 'running'] },
  { name: 'Stethoscope', category: 'Health', keywords: ['doctor', 'consultation', 'physician', 'hospital', 'clinic', 'specialist'] },
  { name: 'Syringe', category: 'Health', keywords: ['vaccine', 'injection', 'blood test', 'lab', 'diagnostics', 'pathology'] },
  { name: 'Dumbbell', category: 'Health', keywords: ['gym', 'fitness', 'workout', 'weights', 'crossfit', 'cult', 'trainer'] },
  { name: 'Smile', category: 'Health', keywords: ['dental', 'dentist', 'teeth', 'smile', 'therapy', 'mental health'] },
  { name: 'Cross', category: 'Health', keywords: ['first aid', 'emergency', 'hospital', 'urgent care', 'ambulance'] },
  { name: 'Sun', category: 'Health', keywords: ['wellness', 'spa', 'massage', 'yoga', 'morning', 'retreat'] },
  { name: 'Moon', category: 'Health', keywords: ['sleep', 'night', 'therapy', 'rest'] },
  { name: 'Baby', category: 'Health', keywords: ['baby', 'pediatric', 'diapers', 'childcare', 'infant', 'maternity'] },
  { name: 'Thermometer', category: 'Health', keywords: ['fever', 'temperature', 'diagnostics', 'sickness'] },
  { name: 'Eye', category: 'Health', keywords: ['eye', 'vision', 'optical', 'checkup', 'ophthalmology'] },

  // 6. Entertainment & Leisure (16 icons)
  { name: 'Clapperboard', category: 'Entertainment', keywords: ['movie', 'cinema', 'theatre', 'film', 'pvr', 'inox', 'bookmyshow'] },
  { name: 'Film', category: 'Entertainment', keywords: ['film', 'cinema', 'stream', 'video', 'netflix', 'prime', 'hotstar'] },
  { name: 'Gamepad2', category: 'Entertainment', keywords: ['game', 'gaming', 'playstation', 'xbox', 'steam', 'esports', 'nintendo'] },
  { name: 'Headphones', category: 'Entertainment', keywords: ['music', 'audio', 'podcast', 'spotify', 'apple music', 'audiobook'] },
  { name: 'Music', category: 'Entertainment', keywords: ['music', 'song', 'concert', 'festival', 'artist', 'tunes'] },
  { name: 'Radio', category: 'Entertainment', keywords: ['radio', 'broadcast', 'podcast', 'fm'] },
  { name: 'Camera', category: 'Entertainment', keywords: ['camera', 'photo', 'photography', 'shoot', 'equipment'] },
  { name: 'Video', category: 'Entertainment', keywords: ['video', 'recording', 'youtube', 'vlog', 'production'] },
  { name: 'BookOpen', category: 'Entertainment', keywords: ['book', 'reading', 'novel', 'magazine', 'kindle', 'library'] },
  { name: 'Palette', category: 'Entertainment', keywords: ['art', 'painting', 'craft', 'hobby', 'drawing', 'design'] },
  { name: 'PartyPopper', category: 'Entertainment', keywords: ['party', 'celebration', 'club', 'event', 'nightlife', 'birthday'] },
  { name: 'TicketCheck', category: 'Entertainment', keywords: ['event', 'ticket', 'concert', 'show', 'amusement park'] },
  { name: 'PlayCircle', category: 'Entertainment', keywords: ['streaming', 'ott', 'video', 'watch', 'subscription'] },
  { name: 'Disc', category: 'Entertainment', keywords: ['album', 'vinyl', 'media', 'cd'] },
  { name: 'Volume2', category: 'Entertainment', keywords: ['sound', 'audio', 'speaker', 'music'] },
  { name: 'Mic', category: 'Entertainment', keywords: ['podcast', 'singing', 'karaoke', 'voice', 'microphone'] },

  // 7. Tech, Work & Education (16 icons)
  { name: 'Briefcase', category: 'Work & Education', keywords: ['work', 'job', 'business', 'office', 'career', 'profession', 'salary'] },
  { name: 'Laptop', category: 'Work & Education', keywords: ['laptop', 'computer', 'tech', 'electronics', 'macbook', 'work', 'software'] },
  { name: 'Monitor', category: 'Work & Education', keywords: ['desktop', 'screen', 'display', 'setup', 'workstation'] },
  { name: 'Smartphone', category: 'Work & Education', keywords: ['phone', 'mobile', 'recharge', 'iphone', 'android', 'device', 'app'] },
  { name: 'Tablet', category: 'Work & Education', keywords: ['ipad', 'tablet', 'gadget', 'device'] },
  { name: 'GraduationCap', category: 'Work & Education', keywords: ['education', 'college', 'school', 'tuition', 'degree', 'course', 'university', 'fees'] },
  { name: 'Book', category: 'Work & Education', keywords: ['study', 'textbook', 'course', 'learning', 'exam'] },
  { name: 'Award', category: 'Work & Education', keywords: ['award', 'certificate', 'achievement', 'prize', 'recognition'] },
  { name: 'Cpu', category: 'Work & Education', keywords: ['hardware', 'gadgets', 'tech', 'processor', 'component'] },
  { name: 'HardDrive', category: 'Work & Education', keywords: ['cloud', 'storage', 'backup', 'drive', 'hosting'] },
  { name: 'Printer', category: 'Work & Education', keywords: ['print', 'stationery', 'paper', 'photocopy', 'xerox'] },
  { name: 'Folder', category: 'Work & Education', keywords: ['files', 'documents', 'archive', 'paperwork'] },
  { name: 'FileText', category: 'Work & Education', keywords: ['tax', 'legal', 'contract', 'documents', 'stamp duty'] },
  { name: 'Mail', category: 'Work & Education', keywords: ['email', 'post', 'letter', 'newsletter'] },
  { name: 'Phone', category: 'Work & Education', keywords: ['call', 'telecom', 'mobile recharge', 'postpaid', 'bill'] },
  { name: 'Calculator', category: 'Work & Education', keywords: ['accounting', 'ca', 'audit', 'taxes', 'itr', 'gst'] },

  // 8. Finance, Banking & Investments (16 icons)
  { name: 'Landmark', category: 'Finance', keywords: ['bank', 'banking', 'savings', 'branch', 'deposit', 'account'] },
  { name: 'Wallet', category: 'Finance', keywords: ['wallet', 'cash', 'money', 'pocket money', 'petty cash'] },
  { name: 'CreditCard', category: 'Finance', keywords: ['credit card', 'debit card', 'card bill', 'visa', 'mastercard'] },
  { name: 'Coins', category: 'Finance', keywords: ['coins', 'gold', 'silver', 'change', 'bullion', 'sovereign'] },
  { name: 'Banknote', category: 'Finance', keywords: ['salary', 'cash', 'income', 'wages', 'stipend', 'payout', 'currency'] },
  { name: 'PiggyBank', category: 'Finance', keywords: ['savings', 'piggy bank', 'emergency fund', 'deposit', 'fd', 'rd'] },
  { name: 'TrendingUp', category: 'Finance', keywords: ['investments', 'stocks', 'mutual funds', 'returns', 'profit', 'shares', 'trading', 'sip'] },
  { name: 'TrendingDown', category: 'Finance', keywords: ['loss', 'expense', 'debt', 'drawdown'] },
  { name: 'DollarSign', category: 'Finance', keywords: ['dollar', 'money', 'forex', 'currency', 'foreign exchange'] },
  { name: 'ReceiptText', category: 'Finance', keywords: ['invoice', 'bill', 'receipt', 'tax invoice'] },
  { name: 'Percent', category: 'Finance', keywords: ['interest', 'tax', 'rate', 'roi', 'dividend'] },
  { name: 'Scale', category: 'Finance', keywords: ['law', 'legal', 'fines', 'court', 'penalty'] },
  { name: 'HandCoins', category: 'Finance', keywords: ['loan', 'lending', 'borrowing', 'emi', 'debt', 'credit', 'given', 'received'] },
  { name: 'Vault', category: 'Finance', keywords: ['locker', 'safety', 'vault', 'gold locker', 'security'] },
  { name: 'CalendarRange', category: 'Finance', keywords: ['emi', 'repayment', 'scheduled', 'monthly payment', 'installment'] },
  { name: 'RotateCcw', category: 'Finance', keywords: ['refund', 'cashback', 'reversal', 'return'] },

  // 9. Personal, Family & Pets (16 icons)
  { name: 'Users', category: 'Family & Personal', keywords: ['family', 'parents', 'relatives', 'household', 'people', 'group'] },
  { name: 'User', category: 'Family & Personal', keywords: ['personal', 'self', 'individual', 'me'] },
  { name: 'UserCheck', category: 'Family & Personal', keywords: ['salary', 'employee', 'staff', 'domestic help', 'driver', 'maid'] },
  { name: 'Dog', category: 'Family & Personal', keywords: ['dog', 'pet', 'vet', 'puppy', 'pet food', 'animal'] },
  { name: 'Cat', category: 'Family & Personal', keywords: ['cat', 'kitten', 'pet', 'feline', 'pet care'] },
  { name: 'HeartHandshake', category: 'Family & Personal', keywords: ['charity', 'donation', 'ngo', 'help', 'gift', 'support'] },
  { name: 'TreePine', category: 'Family & Personal', keywords: ['garden', 'nature', 'plants', 'nursery', 'outdoor', 'park'] },
  { name: 'Flower2', category: 'Family & Personal', keywords: ['flowers', 'florist', 'bouquet', 'gardening', 'decoration'] },
  { name: 'Scissors', category: 'Family & Personal', keywords: ['salon', 'haircut', 'barber', 'grooming', 'beauty', 'spa'] },
  { name: 'Bell', category: 'Family & Personal', keywords: ['reminder', 'subscription', 'alert', 'notice'] },
  { name: 'Shield', category: 'Family & Personal', keywords: ['insurance', 'life insurance', 'term insurance', 'lic', 'protection'] },
  { name: 'ShieldCheck', category: 'Family & Personal', keywords: ['health insurance', 'policy', 'premium', 'safety'] },
  { name: 'Church', category: 'Family & Personal', keywords: ['temple', 'worship', 'pooja', 'religion', 'spiritual', 'prayer'] },
  { name: 'LandPlot', category: 'Family & Personal', keywords: ['real estate', 'property', 'plot', 'land'] },
  { name: 'Footprints', category: 'Family & Personal', keywords: ['footwear', 'shoes', 'sandals', 'sneakers'] },
  { name: 'Umbrella', category: 'Family & Personal', keywords: ['umbrella', 'rain', 'weather', 'monsoon', 'protection'] },
];

export const CATEGORY_COLOR_PALETTE = [
  '#FF3B30', // Red
  '#FF9500', // Orange
  '#FFCC00', // Amber/Yellow
  '#34C759', // Green
  '#00C9A7', // Emerald
  '#007AFF', // Blue
  '#5856D6', // Indigo
  '#AF52DE', // Purple
  '#FF2D55', // Pink
  '#FD79A8', // Soft Pink
  '#5AC8FA', // Sky Blue
  '#20C997', // Mint
  '#748FFC', // Cornflower Blue
  '#E17055', // Terracotta
  '#A06A42', // Warm Brown
  '#8E8E93', // Cool Grey
];

export function getSmartIconSuggestions(query: string): IconDefinition[] {
  const clean = query.trim().toLowerCase();
  if (!clean) {
    return CATEGORY_ICONS_LIST.slice(0, 8);
  }

  const scored = CATEGORY_ICONS_LIST.map((item) => {
    let score = 0;
    const nameLower = item.name.toLowerCase();

    // Exact name match
    if (nameLower === clean) score += 100;
    else if (nameLower.startsWith(clean)) score += 50;
    else if (nameLower.includes(clean)) score += 30;

    // Keyword matches
    item.keywords.forEach((kw) => {
      if (kw === clean) score += 40;
      else if (clean.includes(kw) || kw.includes(clean)) score += 20;
    });

    return { item, score };
  });

  const matches = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);

  if (matches.length < 4) {
    // Fill with top popular icons if fewer matches
    const existing = new Set(matches.map((m) => m.item.name));
    for (const def of CATEGORY_ICONS_LIST) {
      if (!existing.has(def.name)) {
        matches.push({ item: def, score: 0 });
        existing.add(def.name);
        if (matches.length >= 8) break;
      }
    }
  }

  return matches.slice(0, 8).map((m) => m.item);
}
