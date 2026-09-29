export interface Category3DItem {
  id: string;
  name: string;
  group: string;
  path: string;
  keywords: string[];
}

export const CATEGORY_3D_ICONS_LIST: Category3DItem[] = [
  // 1. Food & Dining
  { id: 'food', name: 'Hot Bowl', group: 'Food & Dining', path: 'Steaming%20bowl/3D/steaming_bowl_3d.png',    keywords: [
      'food', 'dining', 'noodles', 'ramen', 'soup', 'eat', 'meal', 'restaurant',
      'swiggy', 'zomato', 'dinner', 'lunch', 'breakfast', 'brunch', 'snack', 'dhaba', 'tiffin', 'dineout'
    ]
  },
  {
    id: 'grocery',
    name: 'Grocery Bag',
    group: 'Food & Dining',
    path: 'Shopping%20bags/3D/shopping_bags_3d.png',
    keywords: [
      'grocery', 'groceries', 'supermarket', 'mart', 'market', 'items', 'kirana',
      'blinkit', 'zepto', 'instamart', 'dmart', 'ration', 'vegetables', 'veggies', 'fruits', 'milk', 'dairy', 'provisions'
    ]
  },
  {
    id: 'beverage',
    name: 'Cocktail Drink',
    group: 'Food & Dining',
    path: 'Tropical%20drink/3D/tropical_drink_3d.png',
    keywords: [
      'beverage', 'drink', 'juice', 'cocktail', 'cold drink', 'bar', 'party',
      'beer', 'wine', 'alcohol', 'liquor', 'pub', 'club', 'soda', 'beverages', 'mocktail'
    ]
  },
  {
    id: 'coffee',
    name: 'Coffee Cup',
    group: 'Food & Dining',
    path: 'Hot%20beverage/3D/hot_beverage_3d.png',
    keywords: [
      'coffee', 'tea', 'cafe', 'latte', 'cappuccino', 'starbucks', 'hot drink',
      'chai', 'espresso', 'costa', 'ccd', 'brew', 'matcha', 'boba'
    ]
  },
  {
    id: 'pizza',
    name: 'Pizza Slice',
    group: 'Food & Dining',
    path: 'Pizza/3D/pizza_3d.png',
    keywords: ['pizza', 'dominos', 'pizzahut', 'fast food', 'junk', 'snack', 'swiggy', 'zomato', 'slice', 'italian']
  },
  {
    id: 'burger',
    name: 'Burger',
    group: 'Food & Dining',
    path: 'Hamburger/3D/hamburger_3d.png',
    keywords: ['burger', 'mcdonalds', 'burgerking', 'kfc', 'fast food', 'junk', 'snack', 'fries']
  },
  {
    id: 'cake',
    name: 'Birthday Cake',
    group: 'Food & Dining',
    path: 'Birthday%20cake/3D/birthday_cake_3d.png',
    keywords: ['cake', 'bakery', 'sweet', 'dessert', 'birthday', 'party', 'pastry', 'celebration', 'anniversary']
  },
  {
    id: 'cookie',
    name: 'Cookie',
    group: 'Food & Dining',
    path: 'Cookie/3D/cookie_3d.png',
    keywords: ['cookie', 'snack', 'biscuit', 'junk', 'sweet', 'bakery', 'cookies']
  },
  {
    id: 'broccoli',
    name: 'Broccoli',
    group: 'Food & Dining',
    path: 'Broccoli/3D/broccoli_3d.png',
    keywords: ['broccoli', 'vegetable', 'veggie', 'healthy', 'salad', 'organic', 'vegan', 'greens']
  },
  {
    id: 'carrot',
    name: 'Carrot',
    group: 'Food & Dining',
    path: 'Carrot/3D/carrot_3d.png',
    keywords: ['carrot', 'vegetable', 'veggies', 'organic', 'farm', 'salad']
  },
  {
    id: 'apple',
    name: 'Red Apple',
    group: 'Food & Dining',
    path: 'Red%20apple/3D/red_apple_3d.png',
    keywords: ['apple', 'fruit', 'fruits', 'diet', 'healthy', 'nutrition']
  },

  // 2. Housing & Utilities
  {
    id: 'house',
    name: 'House',
    group: 'Housing & Bills',
    path: 'House/3D/house_3d.png',
    keywords: ['house', 'home', 'rent', 'flat', 'apartment', 'residence', 'pg', 'room', 'society', 'maintenance', 'housing']
  },
  {
    id: 'home_garden',
    name: 'Family Home',
    group: 'Housing & Bills',
    path: 'House%20with%20garden/3D/house_with_garden_3d.png',
    keywords: ['home', 'property', 'society', 'villa', 'mortgage', 'estate']
  },
  {
    id: 'electric',
    name: 'Light Bulb',
    group: 'Housing & Bills',
    path: 'Light%20bulb/3D/light_bulb_3d.png',
    keywords: [
      'electric', 'electricity', 'power', 'light', 'bill', 'eb', 'energy',
      'bescom', 'tneb', 'mseb', 'current', 'electric bill', 'utility', 'utilities'
    ]
  },
  {
    id: 'water',
    name: 'Water Drop',
    group: 'Housing & Bills',
    path: 'Droplet/3D/droplet_3d.png',
    keywords: ['water', 'aqua', 'water bill', 'filter', 'tanker', 'plumbing', 'jal', 'ro', 'purifier']
  },
  {
    id: 'gas',
    name: 'Fire / Gas',
    group: 'Housing & Bills',
    path: 'Fire/3D/fire_3d.png',
    keywords: ['gas', 'fuel', 'fire', 'lpg', 'cylinder', 'heating', 'indane', 'hp gas', 'bharat gas', 'png', 'piped gas']
  },
  {
    id: 'internet',
    name: 'Satellite / WiFi',
    group: 'Housing & Bills',
    path: 'Satellite%20antenna/3D/satellite_antenna_3d.png',
    keywords: ['internet', 'wifi', 'broadband', 'network', 'airtel', 'jio', 'act', 'fiber', 'router', 'data', 'lan']
  },
  {
    id: 'wrench',
    name: 'Maintenance',
    group: 'Housing & Bills',
    path: 'Wrench/3D/wrench_3d.png',
    keywords: ['repair', 'maintenance', 'tools', 'mechanic', 'fix', 'service', 'plumber', 'urban company', 'hardware']
  },
  {
    id: 'hammer',
    name: 'Construction',
    group: 'Housing & Bills',
    path: 'Hammer/3D/hammer_3d.png',
    keywords: ['hammer', 'carpenter', 'renovation', 'diy', 'construction', 'woodwork']
  },
  {
    id: 'key',
    name: 'Key',
    group: 'Housing & Bills',
    path: 'Key/3D/key_3d.png',
    keywords: ['key', 'rent', 'deposit', 'tenant', 'brokerage', 'lease', 'lock', 'security deposit']
  },

  // 3. Transport & Travel
  {
    id: 'holiday',
    name: 'Beach Island',
    group: 'Transport & Travel',
    path: 'Beach%20with%20umbrella/3D/beach_with_umbrella_3d.png',
    keywords: ['holiday', 'vacation', 'beach', 'summer', 'island', 'resort', 'trip', 'goa', 'hotel', 'staycation', 'airbnb']
  },
  {
    id: 'travel',
    name: 'Airplane',
    group: 'Transport & Travel',
    path: 'Airplane/3D/airplane_3d.png',
    keywords: ['travel', 'flight', 'airplane', 'airport', 'trip', 'airline', 'indigo', 'airindia', 'ticket', 'air travel', 'boarding']
  },
  {
    id: 'car',
    name: 'Automobile',
    group: 'Transport & Travel',
    path: 'Automobile/3D/automobile_3d.png',
    keywords: [
      'car', 'cab', 'auto', 'uber', 'ola', 'taxi', 'drive', 'transport',
      'rapido', 'fastag', 'toll', 'parking', 'vehicle', 'scooter', 'bike', 'commute'
    ]
  },
  {
    id: 'fuel',
    name: 'Fuel Pump',
    group: 'Transport & Travel',
    path: 'Fuel%20pump/3D/fuel_pump_3d.png',
    keywords: ['fuel', 'petrol', 'diesel', 'gas', 'cng', 'station', 'shell', 'hp', 'iocl', 'bpcl', 'gas station']
  },
  {
    id: 'bus',
    name: 'Bus',
    group: 'Transport & Travel',
    path: 'Bus/3D/bus_3d.png',
    keywords: ['bus', 'transit', 'public transport', 'commute', 'train', 'metro', 'railway', 'irctc', 'subway', 'tram']
  },
  {
    id: 'luggage',
    name: 'Suitcase',
    group: 'Transport & Travel',
    path: 'Luggage/3D/luggage_3d.png',
    keywords: ['luggage', 'baggage', 'travel', 'trip', 'tour', 'journey', 'packing', 'suitcase']
  },
  {
    id: 'compass',
    name: 'Compass',
    group: 'Transport & Travel',
    path: 'Compass/3D/compass_3d.png',
    keywords: ['compass', 'trip', 'explore', 'adventure', 'trek', 'hiking', 'nature', 'travel']
  },

  // 4. Fitness & Health
  {
    id: 'gym',
    name: 'Running Shoe',
    group: 'Fitness & Health',
    path: 'Running%20shoe/3D/running_shoe_3d.png',
    keywords: [
      'gym', 'fitness', 'workout', 'training', 'running', 'sport', 'exercise',
      'cult', 'crossfit', 'yoga', 'pilates', 'jogging', 'marathon', 'cardio', 'shoes', 'sneakers'
    ]
  },
  {
    id: 'fitness',
    name: 'Boxing Glove',
    group: 'Fitness & Health',
    path: 'Boxing%20glove/3D/boxing_glove_3d.png',
    keywords: ['boxing', 'fitness', 'combat', 'gym', 'workout', 'sports', 'martial arts', 'training']
  },
  {
    id: 'biceps',
    name: 'Flexed Arm',
    group: 'Fitness & Health',
    path: 'Flexed%20biceps/Default/3D/flexed_biceps_3d_default.png',
    keywords: ['bodybuilding', 'muscle', 'gym', 'health', 'protein', 'strength', 'supplement']
  },
  {
    id: 'medical',
    name: 'Medicine Pill',
    group: 'Fitness & Health',
    path: 'Pill/3D/pill_3d.png',
    keywords: [
      'medical', 'medicine', 'pharmacy', 'doctor', 'hospital', 'chemist', 'drugs',
      'clinic', 'apollo', '1mg', 'pharmeasy', 'tablets', 'health', 'dental', 'dentist', 'eye', 'checkup', 'test', 'lab'
    ]
  },
  {
    id: 'trophy',
    name: 'Trophy',
    group: 'Fitness & Health',
    path: 'Trophy/3D/trophy_3d.png',
    keywords: ['trophy', 'prize', 'winner', 'competition', 'award', 'victory', 'first']
  },
  {
    id: 'medal',
    name: 'Medal',
    group: 'Fitness & Health',
    path: 'Sports%20medal/3D/sports_medal_3d.png',
    keywords: ['medal', 'sports', 'achievement', 'race', 'event']
  },
  {
    id: 'heart',
    name: 'Heart Ribbon',
    group: 'Fitness & Health',
    path: 'Heart%20with%20ribbon/3D/heart_with_ribbon_3d.png',
    keywords: [
      'charity', 'health', 'wellness', 'love', 'care', 'donation', 'ngo', 'pet',
      'dog', 'cat', 'puppy', 'kitten', 'vet', 'animal', 'veterinary'
    ]
  },

  // 5. Shopping & Lifestyle
  {
    id: 'shopping',
    name: 'Shopping Bags',
    group: 'Shopping & Goods',
    path: 'Shopping%20bags/3D/shopping_bags_3d.png',
    keywords: [
      'shopping', 'mall', 'store', 'buy', 'retail', 'amazon', 'myntra', 'flipkart',
      'meesho', 'purchase', 'order', 'lifestyle', 'shop'
    ]
  },
  {
    id: 'clothes',
    name: 'T-Shirt',
    group: 'Shopping & Goods',
    path: 'T-shirt/3D/t-shirt_3d.png',
    keywords: ['clothes', 'clothing', 'fashion', 'shirt', 'apparel', 'wear', 'dress', 'zara', 'h&m', 'outfit', 'jeans']
  },
  {
    id: 'gift',
    name: 'Gift Box',
    group: 'Shopping & Goods',
    path: 'Wrapped%20gift/3D/wrapped_gift_3d.png',
    keywords: ['gift', 'present', 'birthday', 'festival', 'surprise', 'treat', 'diwali', 'rakhi', 'christmas', 'wedding']
  },
  {
    id: 'sparkles',
    name: 'Sparkles',
    group: 'Shopping & Goods',
    path: 'Sparkles/3D/sparkles_3d.png',
    keywords: [
      'sparkles', 'jewelry', 'gold', 'beauty', 'salon', 'makeup', 'spa', 'haircut',
      'parlour', 'cosmetics', 'skincare', 'grooming', 'facial', 'massage'
    ]
  },
  {
    id: 'crown',
    name: 'Crown',
    group: 'Shopping & Goods',
    path: 'Crown/3D/crown_3d.png',
    keywords: ['crown', 'vip', 'premium', 'luxury', 'membership', 'exclusive']
  },
  {
    id: 'gem',
    name: 'Gem Stone',
    group: 'Shopping & Goods',
    path: 'Gem%20stone/3D/gem_stone_3d.png',
    keywords: ['diamond', 'gem', 'luxury', 'jewelry', 'stone', 'ring', 'necklace']
  },
  {
    id: 'package',
    name: 'Package Box',
    group: 'Shopping & Goods',
    path: 'Package/3D/package_3d.png',
    keywords: ['package', 'parcel', 'courier', 'delivery', 'box', 'order', 'shipping']
  },

  // 6. Tech, Software & Work
  {
    id: 'laptop',
    name: 'Laptop',
    group: 'Tech & Work',
    path: 'Laptop/3D/laptop_3d.png',
    keywords: ['laptop', 'computer', 'macbook', 'work', 'tech', 'software', 'hardware', 'gadgets', 'electronics']
  },
  {
    id: 'phone',
    name: 'Smartphone',
    group: 'Tech & Work',
    path: 'Mobile%20phone/3D/mobile_phone_3d.png',
    keywords: ['phone', 'mobile', 'iphone', 'android', 'recharge', 'sim', 'telecom', 'smartphone', 'airtel', 'jio', 'vi']
  },
  {
    id: 'cloud',
    name: 'Cloud Storage',
    group: 'Tech & Work',
    path: 'Cloud/3D/cloud_3d.png',
    keywords: ['cloud', 'icloud', 'google drive', 'onedrive', 'dropbox', 'storage', 'backup', 'aws', 'saas', 'google one', 'hosting']
  },
  {
    id: 'shield',
    name: 'Security Shield',
    group: 'Tech & Work',
    path: 'Shield/3D/shield_3d.png',
    keywords: ['shield', 'security', 'vpn', 'antivirus', 'nordvpn', 'expressvpn', 'surfshark', 'protection', 'safe', 'privacy', 'cyber']
  },
  {
    id: 'bell',
    name: 'Notification Bell',
    group: 'Tech & Work',
    path: 'Bell/3D/bell_3d.png',
    keywords: ['bell', 'alert', 'notification', 'reminder', 'subscribe', 'subscription', 'ring', 'alarm', 'renew']
  },
  {
    id: 'books',
    name: 'Book Stack',
    group: 'Tech & Work',
    path: 'Books/3D/books_3d.png',
    keywords: ['books', 'study', 'reading', 'novel', 'education', 'stationery', 'kindle', 'audible', 'magazine', 'library']
  },
  {
    id: 'education',
    name: 'Grad Cap',
    group: 'Tech & Work',
    path: 'Graduation%20cap/3D/graduation_cap_3d.png',
    keywords: ['education', 'college', 'school', 'university', 'tuition', 'degree', 'course', 'udemy', 'coursera', 'exam', 'fees']
  },
  {
    id: 'briefcase',
    name: 'Briefcase',
    group: 'Tech & Work',
    path: 'Briefcase/3D/briefcase_3d.png',
    keywords: ['work', 'job', 'business', 'office', 'career', 'freelance', 'client', 'consulting', 'gig', 'upwork', 'fiverr']
  },

  // 7. Entertainment, Streaming & Media
  {
    id: 'headphones',
    name: 'Headphones',
    group: 'Entertainment & Media',
    path: 'Headphone/3D/headphone_3d.png',
    keywords: [
      'spotify', 'music', 'headphones', 'earphones', 'songs', 'audio', 'podcast',
      'apple music', 'amazon music', 'gaana', 'wynk', 'jiosaavn', 'soundcloud', 'tunes', 'listen', 'headset', 'airpods'
    ]
  },
  {
    id: 'musical_notes',
    name: 'Music Note',
    group: 'Entertainment & Media',
    path: 'Musical%20notes/3D/musical_notes_3d.png',
    keywords: ['music', 'song', 'spotify', 'notes', 'tunes', 'track', 'singing', 'audio', 'concert', 'rhythm', 'melody']
  },
  {
    id: 'popcorn',
    name: 'Popcorn',
    group: 'Entertainment & Media',
    path: 'Popcorn/3D/popcorn_3d.png',
    keywords: [
      'netflix', 'popcorn', 'movie', 'cinema', 'theatre', 'show', 'film',
      'prime video', 'hotstar', 'binge', 'streaming', 'watch', 'hbo', 'disney', 'snack'
    ]
  },
  {
    id: 'tv',
    name: 'Television',
    group: 'Entertainment & Media',
    path: 'Television/3D/television_3d.png',
    keywords: [
      'tv', 'television', 'ott', 'netflix', 'stream', 'screen', 'prime',
      'hotstar', 'youtube', 'dth', 'sony liv', 'zee5', 'apple tv', 'cable'
    ]
  },
  {
    id: 'clapperboard',
    name: 'Clapperboard',
    group: 'Entertainment & Media',
    path: 'Clapper%20board/3D/clapper_board_3d.png',
    keywords: [
      'movie', 'cinema', 'theatre', 'film', 'pvr', 'entertainment',
      'inox', 'show', 'netflix', 'series', 'ticket', 'production', 'hollywood', 'bollywood'
    ]
  },
  {
    id: 'film_projector',
    name: 'Projector',
    group: 'Entertainment & Media',
    path: 'Film%20projector/3D/film_projector_3d.png',
    keywords: ['projector', 'movie', 'cinema', 'netflix', 'theatre', 'streaming', 'screen', 'film', 'hbo', 'disney']
  },
  {
    id: 'video_game',
    name: 'Game Controller',
    group: 'Entertainment & Media',
    path: 'Video%20game/3D/video_game_3d.png',
    keywords: [
      'game', 'gaming', 'playstation', 'ps5', 'xbox', 'steam', 'nintendo',
      'pubg', 'epic games', 'discord', 'twitch', 'controller', 'esports', 'switch'
    ]
  },
  {
    id: 'guitar',
    name: 'Guitar',
    group: 'Entertainment & Media',
    path: 'Guitar/3D/guitar_3d.png',
    keywords: ['guitar', 'music', 'instrument', 'band', 'rock', 'spotify', 'acoustic', 'electric', 'strings']
  },
  {
    id: 'microphone',
    name: 'Studio Mic',
    group: 'Entertainment & Media',
    path: 'Studio%20microphone/3D/studio_microphone_3d.png',
    keywords: ['mic', 'microphone', 'podcast', 'spotify', 'audio', 'voice', 'recording', 'karaoke', 'sing']
  },
  {
    id: 'camera',
    name: 'Camera',
    group: 'Entertainment & Media',
    path: 'Camera/3D/camera_3d.png',
    keywords: ['camera', 'photo', 'photography', 'shoot', 'video', 'lens', 'youtube', 'vlog', 'dslr']
  },
  {
    id: 'newspaper',
    name: 'Newspaper',
    group: 'Entertainment & Media',
    path: 'Newspaper/3D/newspaper_3d.png',
    keywords: ['newspaper', 'news', 'magazine', 'medium', 'nyt', 'the hindu', 'journal', 'article', 'press', 'economist', 'wsj', 'sub']
  },

  // 7. Finance & Money
  {
    id: 'banknote',
    name: 'Dollar Cash',
    group: 'Finance & Money',
    path: 'Dollar%20banknote/3D/dollar_banknote_3d.png',
    keywords: ['salary', 'cash', 'income', 'money', 'wages', 'payout', 'stipend', 'paycheck', 'earnings']
  },
  {
    id: 'money',
    name: 'Money Bag',
    group: 'Finance & Money',
    path: 'Money%20bag/3D/money_bag_3d.png',
    keywords: ['money', 'savings', 'bonus', 'funds', 'cash', 'wealth', 'dividend', 'interest', 'cashback', 'refund']
  },
  {
    id: 'investments',
    name: 'Growth Chart',
    group: 'Finance & Money',
    path: 'Chart%20increasing/3D/chart_increasing_3d.png',
    keywords: [
      'investments', 'stocks', 'mutual funds', 'returns', 'profit', 'sip',
      'groww', 'zerodha', 'upstox', 'trading', 'crypto', 'bitcoin', 'equity', 'shares'
    ]
  },
  {
    id: 'credit_card',
    name: 'Credit Card',
    group: 'Finance & Money',
    path: 'Credit%20card/3D/credit_card_3d.png',
    keywords: ['credit card', 'debit card', 'card bill', 'visa', 'mastercard', 'emi', 'cred', 'amex', 'card']
  },
  {
    id: 'receipt',
    name: 'Receipt',
    group: 'Finance & Money',
    path: 'Receipt/3D/receipt_3d.png',
    keywords: ['receipt', 'bill', 'tax', 'invoice', 'expense', 'gst', 'tds', 'insurance', 'policy', 'lic', 'fine']
  },
  {
    id: 'coin',
    name: 'Gold Coin',
    group: 'Finance & Money',
    path: 'Coin/3D/coin_3d.png',
    keywords: ['coin', 'gold', 'silver', 'change', 'bullion', 'coins', 'jewel']
  },
  {
    id: 'target',
    name: 'Bullseye Target',
    group: 'Finance & Goals',
    path: 'Direct%20hit/3D/direct_hit_3d.png',
    keywords: ['target', 'goal', 'bullseye', 'aim', 'focus', 'objective', 'milestone', 'plan']
  },
  {
    id: 'rocket',
    name: 'Rocket Launch',
    group: 'Finance & Goals',
    path: 'Rocket/3D/rocket_3d.png',
    keywords: ['rocket', 'growth', 'fast', 'aggressive', 'launch', 'moon', 'compounding', 'wealth']
  },
  {
    id: 'star',
    name: 'Glowing Star',
    group: 'Finance & Goals',
    path: 'Glowing%20star/3D/glowing_star_3d.png',
    keywords: ['star', 'achievement', 'milestone', 'gold', 'badge', 'favorite', 'rating']
  },
  {
    id: 'fire',
    name: 'Fire Flame',
    group: 'Finance & Goals',
    path: 'Fire/3D/fire_3d.png',
    keywords: ['fire', 'flame', 'streak', 'burn', 'hot', 'saving', 'rate', 'discipline']
  },
  {
    id: 'umbrella',
    name: 'Insurance Cover',
    group: 'Finance & Goals',
    path: 'Umbrella/3D/umbrella_3d.png',
    keywords: ['umbrella', 'insurance', 'safety', 'cover', 'protection', 'policy', 'term', 'health']
  },
  {
    id: 'lock',
    name: 'Fixed Deposit',
    group: 'Finance & Goals',
    path: 'Locked/3D/locked_3d.png',
    keywords: ['lock', 'locked', 'fd', 'fixed deposit', 'security', 'safe', 'vault', 'bond']
  },

  // 8. Appliances
  {
    id: 'ac',
    name: 'Air Conditioner',
    group: 'Appliances',
    path: 'Snowflake/3D/snowflake_3d.png',
    keywords: ['ac', 'air conditioner', 'aircon', 'cooling', 'hvac', 'split ac', 'window ac', 'inverter ac', 'daikin', 'voltas', 'lg', 'samsung', 'carrier', 'blue star', 'cold', 'snowflake']
  },
  {
    id: 'refrigerator',
    name: 'Refrigerator',
    group: 'Appliances',
    path: 'Ice/3D/ice_3d.png',
    keywords: ['refrigerator', 'fridge', 'freezer', 'ice', 'cold storage', 'lg', 'samsung', 'whirlpool', 'godrej', 'haier', 'double door', 'single door']
  },

  // 9. Peer Finance
  {
    id: 'payable',
    name: 'Accounts Payable',
    group: 'Peer Finance',
    path: 'Money%20with%20wings/3D/money_with_wings_3d.png',
    keywords: ['payable', 'pay', 'owe', 'debt', 'borrowed', 'due', 'payment', 'peer', 'friend', 'settle', 'repay', 'return']
  },
  {
    id: 'receivable',
    name: 'Accounts Receivable',
    group: 'Peer Finance',
    path: 'Handshake/3D/handshake_3d.png',
    keywords: ['receivable', 'receive', 'owed', 'lent', 'loan given', 'iou', 'collect', 'peer', 'friend', 'borrowed by', 'due from']
  },
];

/**
 * Fuzzy word matching & suggestion ranker
 */
export function getSmart3DIconSuggestions(query: string): Category3DItem[] {
  const clean = query.trim().toLowerCase();
  if (!clean) {
    return CATEGORY_3D_ICONS_LIST.slice(0, 8);
  }

  const queryWords = clean.split(/[\s,_\-+/]+/).filter(Boolean);

  const scored = CATEGORY_3D_ICONS_LIST.map((item) => {
    let score = 0;
    const nameLower = item.name.toLowerCase();
    const idLower = item.id.toLowerCase();

    // 1. Direct ID / Name exact or start matching
    if (nameLower === clean || idLower === clean) score += 120;
    else if (nameLower.startsWith(clean) || idLower.startsWith(clean)) score += 80;
    else if (nameLower.includes(clean) || idLower.includes(clean)) score += 40;

    // 2. Keyword exact & substring matching
    item.keywords.forEach((kw) => {
      const kwLower = kw.toLowerCase();
      if (kwLower === clean) {
        score += 100;
      } else if (clean.includes(kwLower)) {
        score += 60;
      } else if (kwLower.includes(clean)) {
        score += 40;
      }

      // Check multi-word tokens
      for (const w of queryWords) {
        if (kwLower === w) score += 50;
        else if (kwLower.startsWith(w)) score += 30;
        else if (w.length >= 3 && kwLower.includes(w)) score += 20;
      }
    });

    return { item, score };
  });

  const matches = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);

  if (matches.length < 4) {
    const existing = new Set(matches.map((m) => m.item.id));
    for (const def of CATEGORY_3D_ICONS_LIST) {
      if (!existing.has(def.id)) {
        matches.push({ item: def, score: 0 });
        existing.add(def.id);
        if (matches.length >= 8) break;
      }
    }
  }

  return matches.slice(0, 8).map((m) => m.item);
}

/**
 * Automatically predicts the single best 3D icon ID from text using fuzzy matching
 */
export function findBest3DIconForText(query: string): string {
  const suggestions = getSmart3DIconSuggestions(query);
  if (suggestions && suggestions.length > 0) {
    return suggestions[0].id;
  }
  return 'food';
}

export const LOAN_3D_ICON_MAP: Record<string, string> = {
  home: 'house',
  car: 'transport',
  personal: 'salary',
  education: 'education',
  other: 'loan',
};

