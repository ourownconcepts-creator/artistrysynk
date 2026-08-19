export interface ServiceCategory {
  label: string;
  subcategories: string[];
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    label: "Music Production",
    subcategories: ["Beat Making", "Instrumentals", "Session Musician", "Topline & Melody", "Vocal Production", "Arrangement"],
  },
  {
    label: "Mixing & Mastering",
    subcategories: ["Mixing", "Mastering", "Stem Mastering", "Vocal Tuning", "Audio Restoration", "Dolby Atmos Mix"],
  },
  {
    label: "Songwriting",
    subcategories: ["Lyric Writing", "Ghostwriting", "Rap Verses", "Hooks & Choruses", "Jingles", "Translation & Adaptation"],
  },
  {
    label: "Video Production",
    subcategories: ["Music Video", "Video Editing", "Motion Graphics", "Colour Grading", "Lyric Video", "Animation"],
  },
  {
    label: "Photography",
    subcategories: ["Artist Portraits", "Event Coverage", "Cover Art Shoot", "Product Photography", "Photo Retouching"],
  },
  {
    label: "Graphic Design",
    subcategories: ["Cover Art", "Logo & Branding", "Merch Design", "Flyers & Posters", "Press Kit Design", "Thumbnails"],
  },
  {
    label: "Social Media Management",
    subcategories: ["Content Strategy", "Content Creation", "Community Management", "Short-Form Editing", "Paid Ads"],
  },
  {
    label: "Artist Management",
    subcategories: ["Career Strategy", "Booking & Touring", "Release Planning", "A&R Consulting", "Contract Review"],
  },
  {
    label: "Promotion",
    subcategories: ["Playlist Pitching", "Press & PR", "Radio Plugging", "Influencer Campaigns", "Blog Placement"],
  },
  {
    label: "Sports & Performance",
    subcategories: ["Personal Training", "Sports Coaching", "Fitness Programmes", "Choreography & Movement", "Performance Filming", "Athlete Branding", "Event Performance", "Recovery & Physiotherapy", "Scouting & Representation"],
  },
  {
    label: "Other",
    subcategories: ["Consultation", "Voiceover", "Podcast Production", "Web & App Development", "Custom Request"],
  },
];

export const CATEGORY_LABELS = SERVICE_CATEGORIES.map((c) => c.label);

export const getSubcategories = (category: string): string[] =>
  SERVICE_CATEGORIES.find((c) => c.label === category)?.subcategories ?? [];
