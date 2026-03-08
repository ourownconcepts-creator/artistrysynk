import { Music, Mic, Users, Camera, Film, Palette, Headphones, Pen, Scissors, Monitor } from "lucide-react";

export interface RoleCategory {
  label: string;
  roles: { value: string; label: string; icon: any }[];
}

export const roleCategories: RoleCategory[] = [
  {
    label: "Music & Audio",
    roles: [
      { value: "musician", label: "Musician", icon: Music },
      { value: "singer", label: "Singer", icon: Mic },
      { value: "rapper", label: "Rapper", icon: Mic },
      { value: "producer", label: "Producer", icon: Headphones },
      { value: "beatmaker", label: "Beatmaker", icon: Music },
      { value: "songwriter", label: "Songwriter", icon: Pen },
      { value: "dj", label: "DJ", icon: Headphones },
      { value: "sound_engineer", label: "Sound Engineer", icon: Monitor },
      { value: "vocal_coach", label: "Vocal Coach", icon: Mic },
      { value: "performer", label: "Performer", icon: Users },
    ],
  },
  {
    label: "Film, Media & Content",
    roles: [
      { value: "filmmaker", label: "Filmmaker", icon: Film },
      { value: "video_editor", label: "Video Editor", icon: Film },
      { value: "director", label: "Director", icon: Film },
      { value: "cinematographer", label: "Cinematographer", icon: Camera },
      { value: "actor", label: "Actor", icon: Film },
      { value: "animator", label: "Animator", icon: Monitor },
      { value: "motion_designer", label: "Motion Designer", icon: Monitor },
      { value: "podcaster", label: "Podcaster", icon: Mic },
      { value: "videographer", label: "Videographer", icon: Camera },
      { value: "voiceover_artist", label: "Voice-Over Artist", icon: Mic },
      { value: "screenwriter", label: "Screenwriter", icon: Pen },
    ],
  },
  {
    label: "Visual & Design",
    roles: [
      { value: "graphic_designer", label: "Graphic Designer", icon: Palette },
      { value: "designer", label: "UI/UX Designer", icon: Palette },
      { value: "illustrator", label: "Illustrator", icon: Palette },
      { value: "photographer", label: "Photographer", icon: Camera },
    ],
  },
  {
    label: "Fashion & Lifestyle",
    roles: [
      { value: "fashion_designer", label: "Fashion Designer", icon: Scissors },
      { value: "stylist", label: "Stylist", icon: Scissors },
      { value: "model", label: "Model", icon: Users },
      { value: "makeup_artist", label: "Makeup Artist", icon: Palette },
      { value: "vixen", label: "Vixen", icon: Camera },
      { value: "dancer", label: "Dancer", icon: Users },
    ],
  },
  {
    label: "Writing & Direction",
    roles: [
      { value: "writer", label: "Writer", icon: Pen },
      { value: "creative_director", label: "Creative Director", icon: Users },
      { value: "strategist", label: "Strategist", icon: Users },
      { value: "promoter", label: "Promoter", icon: Users },
      { value: "manager", label: "Manager", icon: Users },
    ],
  },
  {
    label: "Culture & Performance",
    roles: [
      { value: "choreographer", label: "Choreographer", icon: Users },
    ],
  },
];

export const allRoles = roleCategories.flatMap((c) => c.roles);

export const getRoleLabel = (value: string): string => {
  const role = allRoles.find((r) => r.value === value);
  return role?.label || value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};
