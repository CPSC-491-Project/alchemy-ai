// SCRUM-186: Static fallback ingredient vocabulary.
//
// Hand-curated list of CocktailDB canonical ingredient names, grouped by
// category. Used by the matcher when the full CocktailDB list hasn't yet
// been fetched and cached (see backend/services/cocktailDbVocabulary.js).
//
// Keeping this static means the matcher and its tests can run with zero
// external dependencies — no network, no Firestore — which is important
// for CI and for local dev without GCP / CocktailDB reachability.
//
// Source: https://www.thecocktaildb.com/api/json/v1/1/list.php?i=list
// Scope: ~180 common ingredients covering most home-bar labels. The live
// vocabulary service replaces this with the full list (~500 entries) at
// runtime when available.

const SPIRITS = [
  'Gin',
  'Vodka',
  'Rum',
  'White rum',
  'Dark rum',
  'Spiced rum',
  'Tequila',
  'Mezcal',
  'Whiskey',
  'Whisky',
  'Bourbon',
  'Rye whiskey',
  'Scotch',
  'Cognac',
  'Brandy',
  'Cachaca',
  'Absinthe',
  'Aquavit',
  'Everclear',
  'Grain alcohol',
];

const LIQUEURS = [
  'Amaretto',
  'Baileys irish cream',
  'Benedictine',
  'Blue curacao',
  'Chambord',
  'Chartreuse',
  'Cointreau',
  'Creme de cassis',
  'Creme de menthe',
  'Creme de cacao',
  'Drambuie',
  'Frangelico',
  'Galliano',
  'Godiva liqueur',
  'Grand marnier',
  'Jagermeister',
  'Kahlua',
  'Malibu rum',
  'Maraschino liqueur',
  'Midori melon liqueur',
  'Peach schnapps',
  'Peppermint schnapps',
  'Sambuca',
  'Southern comfort',
  'Triple sec',
  'Tia maria',
  'Vermouth',
  'Dry vermouth',
  'Sweet vermouth',
  'Campari',
  'Aperol',
  'Sloe gin',
  'Amaro',
  'Fernet branca',
  'Limoncello',
  'St germain',
  'Pimms',
];

const WINE_AND_BEER = [
  'Red wine',
  'White wine',
  'Rose wine',
  'Sparkling wine',
  'Champagne',
  'Prosecco',
  'Cava',
  'Sake',
  'Port',
  'Sherry',
  'Beer',
  'Lager',
  'Stout',
  'Ginger beer',
];

const MIXERS = [
  'Tonic water',
  'Club soda',
  'Soda water',
  'Sparkling water',
  'Ginger ale',
  'Cola',
  'Coca-cola',
  'Pepsi',
  'Sprite',
  '7-up',
  'Lemon-lime soda',
  'Tonic',
  'Bitter lemon',
];

const JUICES = [
  'Lime juice',
  'Lemon juice',
  'Orange juice',
  'Pineapple juice',
  'Cranberry juice',
  'Grapefruit juice',
  'Tomato juice',
  'Apple juice',
  'Pomegranate juice',
  'Passion fruit juice',
  'Mango juice',
  'Guava juice',
  'Coconut cream',
  'Coconut milk',
  'Cream of coconut',
];

const SYRUPS_AND_SWEETENERS = [
  'Simple syrup',
  'Sugar syrup',
  'Sugar',
  'Caster sugar',
  'Brown sugar',
  'Powdered sugar',
  'Honey',
  'Agave syrup',
  'Maple syrup',
  'Grenadine',
  'Orgeat syrup',
  'Elderflower syrup',
  'Ginger syrup',
  'Vanilla syrup',
  'Chocolate syrup',
];

const BITTERS_AND_SEASONING = [
  'Angostura bitters',
  'Peychaud bitters',
  'Orange bitters',
  'Aromatic bitters',
  'Salt',
  'Sea salt',
  'Pepper',
  'Nutmeg',
  'Cinnamon',
  'Cloves',
  'Tabasco sauce',
  'Worcestershire sauce',
];

const DAIRY_AND_EGG = [
  'Milk',
  'Cream',
  'Heavy cream',
  'Half and half',
  'Whipped cream',
  'Egg',
  'Egg white',
  'Egg yolk',
];

const FRUITS_AND_GARNISHES = [
  'Lime',
  'Lemon',
  'Orange',
  'Grapefruit',
  'Pineapple',
  'Cherry',
  'Maraschino cherry',
  'Strawberry',
  'Raspberry',
  'Blueberry',
  'Blackberry',
  'Apple',
  'Pear',
  'Peach',
  'Mango',
  'Banana',
  'Kiwi',
  'Watermelon',
  'Mint',
  'Mint leaves',
  'Basil',
  'Rosemary',
  'Thyme',
  'Cucumber',
  'Ginger',
  'Jalapeno',
  'Olive',
  'Cocktail onion',
];

const OTHER = [
  'Coffee',
  'Espresso',
  'Tea',
  'Ice',
  'Water',
  'Hot water',
  'Cold water',
];

// Flatten into a single deduped, case-preserving list. Category info is kept
// in parallel so downstream callers (e.g. SCRUM-189 cabinet write) can
// suggest a default category when writing to Firestore.

const BY_CATEGORY = {
  spirit: SPIRITS,
  liqueur: LIQUEURS,
  wine_beer: WINE_AND_BEER,
  mixer: MIXERS,
  juice: JUICES,
  syrup: SYRUPS_AND_SWEETENERS,
  bitters: BITTERS_AND_SEASONING,
  dairy: DAIRY_AND_EGG,
  fruit: FRUITS_AND_GARNISHES,
  other: OTHER,
};

const INGREDIENTS = Object.values(BY_CATEGORY).flat();

// name (lowercase) -> category lookup. Useful for the SCRUM-189 write path.
const CATEGORY_BY_NAME = Object.fromEntries(
  Object.entries(BY_CATEGORY).flatMap(([cat, names]) =>
    names.map((n) => [n.toLowerCase(), cat])
  )
);

module.exports = {
  INGREDIENTS,
  BY_CATEGORY,
  CATEGORY_BY_NAME,
};
