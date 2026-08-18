import { Music, Mic, Users, Camera, Film, Palette, Headphones, Pen, Scissors, Monitor, Code, Smartphone, Brain, Blocks, Layout, Layers, Box, Briefcase, Rocket, TrendingUp, Search, Megaphone, Database, Server, Gamepad2, Video, Sparkles, Hand, Eye, Brush, Flower2, Droplet, Footprints, Shirt } from "lucide-react";

export interface RoleCategory {
  label: string;
  roles: { value: string; label: string; icon: any }[];
}

export const roleCategories: RoleCategory[] = [
  {
    label: "Music & Audio",
    roles: [
      { value: "artist", label: "Artist", icon: Music },
      { value: "musician", label: "Musician", icon: Music },
      { value: "singer", label: "Singer", icon: Mic },
      { value: "rapper", label: "Rapper", icon: Mic },
      { value: "producer", label: "Producer", icon: Headphones },
      { value: "beatmaker", label: "Beatmaker", icon: Music },
      { value: "songwriter", label: "Songwriter", icon: Pen },
      { value: "dj", label: "DJ", icon: Headphones },
      { value: "sound_engineer", label: "Sound Engineer", icon: Monitor },
      { value: "audio_engineer", label: "Audio Engineer", icon: Headphones },
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
      { value: "content_creator", label: "Content Creator", icon: Video },
    ],
  },
  {
    label: "Tech & Product",
    roles: [
      { value: "software_developer", label: "Software Developer", icon: Code },
      { value: "frontend_developer", label: "Frontend Developer", icon: Layout },
      { value: "backend_developer", label: "Backend Developer", icon: Server },
      { value: "full_stack_developer", label: "Full Stack Developer", icon: Layers },
      { value: "mobile_app_developer", label: "Mobile App Developer", icon: Smartphone },
      { value: "ai_engineer", label: "AI Engineer", icon: Brain },
      { value: "blockchain_developer", label: "Blockchain Developer", icon: Blocks },
      { value: "data_scientist", label: "Data Scientist", icon: Database },
      { value: "devops_engineer", label: "DevOps Engineer", icon: Server },
      { value: "game_developer", label: "Game Developer", icon: Gamepad2 },
    ],
  },
  {
    label: "Design",
    roles: [
      { value: "graphic_designer", label: "Graphic Designer", icon: Palette },
      { value: "ui_designer", label: "UI Designer", icon: Layout },
      { value: "ux_designer", label: "UX Designer", icon: Layers },
      { value: "product_designer", label: "Product Designer", icon: Box },
      { value: "designer", label: "UI/UX Designer", icon: Palette },
      { value: "illustrator", label: "Illustrator", icon: Palette },
      { value: "3d_designer", label: "3D Designer", icon: Box },
      { value: "photographer", label: "Photographer", icon: Camera },
    ],
  },
  {
    label: "Business & Growth",
    roles: [
      { value: "product_manager", label: "Product Manager", icon: Briefcase },
      { value: "startup_founder", label: "Startup Founder", icon: Rocket },
      { value: "technical_cofounder", label: "Technical Co-Founder", icon: Rocket },
      { value: "growth_marketer", label: "Growth Marketer", icon: TrendingUp },
      { value: "seo_specialist", label: "SEO Specialist", icon: Search },
      { value: "digital_marketer", label: "Digital Marketer", icon: Megaphone },
      { value: "strategist", label: "Strategist", icon: Users },
      { value: "promoter", label: "Promoter", icon: Users },
      { value: "manager", label: "Manager", icon: Users },
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
    label: "Beauty & Grooming",
    roles: [
      { value: "nail_technician", label: "Nail Technician", icon: Hand },
      { value: "nail_artist", label: "Nail Artist", icon: Sparkles },
      { value: "lash_technician", label: "Lash Technician", icon: Eye },
      { value: "brow_artist", label: "Brow Artist", icon: Eye },
      { value: "hair_stylist", label: "Hair Stylist", icon: Scissors },
      { value: "barber", label: "Barber", icon: Scissors },
      { value: "wig_maker", label: "Wig Maker", icon: Sparkles },
      { value: "braider", label: "Braider", icon: Sparkles },
      { value: "sfx_makeup_artist", label: "SFX Makeup Artist", icon: Brush },
      { value: "body_painter", label: "Body Painter", icon: Brush },
      { value: "esthetician", label: "Esthetician", icon: Flower2 },
      { value: "skincare_specialist", label: "Skincare Specialist", icon: Droplet },
      { value: "tattoo_artist", label: "Tattoo Artist", icon: Pen },
      { value: "piercing_artist", label: "Piercing Artist", icon: Sparkles },
      { value: "beauty_content_creator", label: "Beauty Content Creator", icon: Video },
      { value: "pedicurist", label: "Pedicurist", icon: Footprints },
      { value: "wardrobe_stylist", label: "Wardrobe Stylist", icon: Shirt },
    ],
  },
  {
    label: "Writing & Direction",
    roles: [
      { value: "writer", label: "Writer", icon: Pen },
      { value: "creative_director", label: "Creative Director", icon: Users },
      { value: "choreographer", label: "Choreographer", icon: Users },
    ],
  },
];

export const allRoles = roleCategories.flatMap((c) => c.roles);

export const getRoleLabel = (value: string): string => {
  const role = allRoles.find((r) => r.value === value);
  return role?.label || value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};
