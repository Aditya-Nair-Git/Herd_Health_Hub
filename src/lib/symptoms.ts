// Standard symptoms list matching the symptoms_master table
export const STANDARD_SYMPTOMS = [
  'Fever',
  'Cough',
  'Diarrhea',
  'Lameness',
  'Reduced Milk',
  'Nasal Discharge',
  'Loss of Appetite',
  'Lethargy',
  'Bloating',
  'Eye Discharge',
  'Weight Loss',
  'Skin Lesions',
  'Difficulty Breathing',
  'Excessive Salivation',
  'Swelling',
] as const;

export type StandardSymptom = typeof STANDARD_SYMPTOMS[number];
