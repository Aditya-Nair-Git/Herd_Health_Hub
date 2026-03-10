// Breed options mapped by species
export const BREED_OPTIONS: Record<string, string[]> = {
  Cattle: ['Holstein', 'Jersey', 'Angus', 'Hereford', 'Brahman', 'Sahiwal', 'Gir', 'Red Sindhi', 'Tharparkar', 'Kankrej'],
  Buffalo: ['Murrah', 'Nili-Ravi', 'Jaffarabadi', 'Surti', 'Mehsana', 'Bhadawari', 'Nagpuri', 'Pandharpuri'],
  Goat: ['Jamunapari', 'Boer', 'Beetal', 'Barbari', 'Sirohi', 'Black Bengal', 'Osmanabadi', 'Marwari'],
  Sheep: ['Merino', 'Dorper', 'Suffolk', 'Corriedale', 'Nellore', 'Deccani', 'Marwari', 'Chokla'],
};

export function getBreedsForSpecies(species: string): string[] {
  return BREED_OPTIONS[species] || [];
}
