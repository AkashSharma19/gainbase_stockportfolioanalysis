/**
 * LOCAL_3D_ICON_MAP
 * Maps each icon ID to its local require() asset reference.
 * All files live in assets/icons3d/.
 * 
 * IMPORTANT: React Native requires static require() calls — no dynamic paths.
 * Add new icons here + run scripts/download-icons.sh to fetch the PNG.
 */
const LOCAL_3D_ICON_MAP: Record<string, any> = {
  // Food & Dining
  food:           require('../assets/icons3d/food.png'),
  grocery:        require('../assets/icons3d/grocery.png'),
  beverage:       require('../assets/icons3d/beverage.png'),
  coffee:         require('../assets/icons3d/coffee.png'),
  pizza:          require('../assets/icons3d/pizza.png'),
  burger:         require('../assets/icons3d/burger.png'),
  cake:           require('../assets/icons3d/cake.png'),
  cookie:         require('../assets/icons3d/cookie.png'),
  broccoli:       require('../assets/icons3d/broccoli.png'),
  carrot:         require('../assets/icons3d/carrot.png'),
  apple:          require('../assets/icons3d/apple.png'),

  // Housing & Bills
  house:          require('../assets/icons3d/house.png'),
  home_garden:    require('../assets/icons3d/home_garden.png'),
  electric:       require('../assets/icons3d/electric.png'),
  water:          require('../assets/icons3d/water.png'),
  gas:            require('../assets/icons3d/gas.png'),
  internet:       require('../assets/icons3d/internet.png'),
  wrench:         require('../assets/icons3d/wrench.png'),
  hammer:         require('../assets/icons3d/hammer.png'),
  key:            require('../assets/icons3d/key.png'),

  // Transport & Travel
  holiday:        require('../assets/icons3d/holiday.png'),
  travel:         require('../assets/icons3d/travel.png'),
  car:            require('../assets/icons3d/car.png'),
  fuel:           require('../assets/icons3d/fuel.png'),
  bus:            require('../assets/icons3d/bus.png'),
  luggage:        require('../assets/icons3d/luggage.png'),
  compass:        require('../assets/icons3d/compass.png'),

  // Fitness & Health
  gym:            require('../assets/icons3d/gym.png'),
  fitness:        require('../assets/icons3d/fitness.png'),
  biceps:         require('../assets/icons3d/biceps.png'),
  medical:        require('../assets/icons3d/medical.png'),
  trophy:         require('../assets/icons3d/trophy.png'),
  medal:          require('../assets/icons3d/medal.png'),
  heart:          require('../assets/icons3d/heart.png'),

  // Shopping & Goods
  shopping:       require('../assets/icons3d/shopping.png'),
  clothes:        require('../assets/icons3d/clothes.png'),
  gift:           require('../assets/icons3d/gift.png'),
  sparkles:       require('../assets/icons3d/sparkles.png'),
  crown:          require('../assets/icons3d/crown.png'),
  gem:            require('../assets/icons3d/gem.png'),
  package:        require('../assets/icons3d/package.png'),

  // Tech & Work
  laptop:         require('../assets/icons3d/laptop.png'),
  phone:          require('../assets/icons3d/phone.png'),
  cloud:          require('../assets/icons3d/cloud.png'),
  shield:         require('../assets/icons3d/shield.png'),
  bell:           require('../assets/icons3d/bell.png'),
  books:          require('../assets/icons3d/books.png'),
  education:      require('../assets/icons3d/education.png'),
  briefcase:      require('../assets/icons3d/briefcase.png'),

  // Entertainment & Media
  headphones:     require('../assets/icons3d/headphones.png'),
  musical_notes:  require('../assets/icons3d/musical_notes.png'),
  popcorn:        require('../assets/icons3d/popcorn.png'),
  tv:             require('../assets/icons3d/tv.png'),
  clapperboard:   require('../assets/icons3d/clapperboard.png'),
  film_projector: require('../assets/icons3d/film_projector.png'),
  video_game:     require('../assets/icons3d/video_game.png'),
  guitar:         require('../assets/icons3d/guitar.png'),
  microphone:     require('../assets/icons3d/microphone.png'),
  camera:         require('../assets/icons3d/camera.png'),
  newspaper:      require('../assets/icons3d/newspaper.png'),

  // Finance & Money
  banknote:       require('../assets/icons3d/banknote.png'),
  money:          require('../assets/icons3d/money.png'),
  investments:    require('../assets/icons3d/investments.png'),
  credit_card:    require('../assets/icons3d/credit_card.png'),
  receipt:        require('../assets/icons3d/receipt.png'),
  coin:           require('../assets/icons3d/coin.png'),
  transfer:       require('../assets/icons3d/transfer.png'),

  // Finance & Goals
  target:         require('../assets/icons3d/target.png'),
  rocket:         require('../assets/icons3d/rocket.png'),
  star:           require('../assets/icons3d/star.png'),
  fire:           require('../assets/icons3d/fire.png'),
  umbrella:       require('../assets/icons3d/umbrella.png'),
  lock:           require('../assets/icons3d/lock.png'),

  // Extra / shared aliases
  users:          require('../assets/icons3d/users.png'),
  loan:           require('../assets/icons3d/loan.png'),
  pot_of_food:    require('../assets/icons3d/pot_of_food.png'),

  // Appliances
  ac:             require('../assets/icons3d/ac.png'),
  refrigerator:   require('../assets/icons3d/refrigerator.png'),

  // Peer Finance
  payable:        require('../assets/icons3d/payable.png'),
  receivable:     require('../assets/icons3d/receivable.png'),
};

export default LOCAL_3D_ICON_MAP;
