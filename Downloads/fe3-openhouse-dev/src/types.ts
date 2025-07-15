export interface Project {

  cover_poster: string | undefined;
  id: number;
  title: string;
  abstract: string;
  techStack: string[];
  tags: string[];
  thumbnail: string;
  images: string[];
  demoUrl: string;
  likes: number;
  comments: number;
  department: string;
  domain: string;
  team?: string;
  mentor?: string;
  isSoftware?: boolean;
  startupPotential?: string;
  uploadedBy?: string;
  pdfPoster?: string | null;
}
