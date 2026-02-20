export interface ExtractedSkill {
  name: string;
  required: boolean;
  category: string;
}

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  required_skills: ExtractedSkill[];
  preferred_skills: ExtractedSkill[];
  qualifications: string[];
  responsibilities: string[];
  salary: string;
  deadline: string;
  source_url: string;
  source_type: string;
  raw_text: string;
  created_at: string;
}

export type SkillCategory =
  | "programming_languages"
  | "frameworks"
  | "devops"
  | "soft_skills"
  | "domain_knowledge"
  | "tools"
  | "certifications"
  | "other";

export type SkillStatus = "confirmed" | "aspirational" | "rejected";
export type SkillSource = "extracted" | "manual" | "gap_analysis";

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  proficiency: string;
  years_experience: number | null;
  description: string;
  evidence: string[];
  tags: string[];
  translations: Record<string, string>;
  status: SkillStatus;
  source: SkillSource;
  created_at: string;
  updated_at: string;
}

export interface SkillLibrary {
  skills: Skill[];
  updated_at: string;
}

export type DocumentType = "cv" | "letter";

export interface Document {
  id: string;
  type: DocumentType;
  filename: string;
  original_path: string;
  extracted_text: string;
  skills_extracted: boolean;
  created_at: string;
}

export type ApplicationStatus =
  | "draft"
  | "ready"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export interface FollowUp {
  date: string;
  type: string;
  notes: string;
}

export interface GenerationConfig {
  template: string;
  char_limit: number | null;
  language: string;
  tone: string;
}

export interface Application {
  id: string;
  job_id: string;
  status: ApplicationStatus;
  generation_config: GenerationConfig;
  cv_path: string;
  letter_path: string;
  follow_ups: FollowUp[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
