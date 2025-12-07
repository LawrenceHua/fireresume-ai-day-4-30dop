// FireResume AI Type Definitions

// ============================================
// Core Resume Data Types
// ============================================

export interface ContactInfo {
  fullName: string;
  email: string;
  phone?: string;
  location?: string; // City, State
  linkedin?: string;
  portfolio?: string;
  github?: string;
}

export interface Experience {
  id: string;
  title: string;
  company: string;
  location?: string;
  startDate: string; // Format: "May 2023"
  endDate: string; // Format: "Present" or "Dec 2024"
  bullets: string[];
  skills?: string[];
  relevanceScore?: number; // 0-100 based on JD match
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  techStack: string[];
  link?: string; // GitHub, demo, etc.
  bullets: string[];
  relevanceScore?: number; // 0-100 based on JD match
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  location?: string;
  graduationDate: string;
  gpa?: string;
  concentration?: string; // e.g., "IT Strategy and Management, AI & ML"
  awards?: string; // e.g., "Dean's List, Bright Futures Scholar"
  relevantCoursework?: string[];
  honors?: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date?: string;
  link?: string;
}

export interface Publication {
  id: string;
  title: string;
  venue: string;
  date: string;
  link?: string;
  authors?: string[];
}

export interface SkillCategory {
  category: string; // e.g., "Languages", "Frameworks", "Tools", "Methods"
  skills: string[];
}

export interface ResumeData {
  contact: ContactInfo;
  summary?: string;
  experiences: Experience[];
  projects: Project[];
  education: Education[];
  skills: SkillCategory[];
  certifications?: Certification[];
  publications?: Publication[];
  awards?: string[];
  volunteer?: Experience[];
  rawText?: string; // Original parsed text for reference
}

// ============================================
// JD Analysis Types
// ============================================

export type RoleType =
  | "Product Manager"
  | "Software Engineer"
  | "Data Scientist"
  | "Data Engineer"
  | "Machine Learning Engineer"
  | "Technical Program Manager"
  | "UX Designer"
  | "DevOps Engineer"
  | "Full Stack Developer"
  | "Frontend Developer"
  | "Backend Developer"
  | "Mobile Developer"
  | "QA Engineer"
  | "Security Engineer"
  | "Solutions Architect"
  | "Engineering Manager"
  | "Other";

export type SeniorityLevel =
  | "Intern"
  | "Entry Level"
  | "Associate"
  | "Mid-Level"
  | "Senior"
  | "Staff"
  | "Principal"
  | "Director"
  | "VP"
  | "Executive";

export type Domain =
  | "Finance"
  | "Healthcare"
  | "E-commerce"
  | "Enterprise"
  | "Consumer"
  | "AI/ML"
  | "Gaming"
  | "Media"
  | "Education"
  | "Government"
  | "Startup"
  | "Agency"
  | "Other";

export interface SkillCluster {
  category: string;
  skills: string[];
  importance: "required" | "preferred" | "nice-to-have";
}

export interface ImpactTheme {
  theme: string; // e.g., "growth", "efficiency", "reliability", "innovation"
  keywords: string[];
  weight: number; // 0-1
}

export interface JDAnalysis {
  jobTitle: string;
  company?: string;
  roleType: RoleType;
  seniorityLevel: SeniorityLevel;
  domain: Domain;
  yearsExperience?: {
    min?: number;
    max?: number;
  };
  skillClusters: SkillCluster[];
  primaryKeywords: string[]; // Exact phrases from JD
  secondaryKeywords: string[]; // Synonyms and related concepts
  impactThemes: ImpactTheme[];
  responsibilities: string[];
  requirements: string[];
  preferredQualifications: string[];
  rawText: string;
}

export interface RoleClassification {
  roleType: RoleType;
  seniorityLevel: SeniorityLevel;
  domain: Domain;
  confidence: number; // 0-1
}

// ============================================
// Generation Types
// ============================================

export interface RelevanceMap {
  experiences: Record<string, number>; // id -> relevance score
  projects: Record<string, number>;
  skills: Record<string, number>;
  overallMatch: number; // 0-100
}

export interface BulletRewrite {
  original: string;
  rewritten: string;
  keywordsIncluded: string[];
  hasMetric: boolean;
}

export interface LayoutPlan {
  pageCount: 1 | 2;
  sections: LayoutSection[];
  totalLines: number;
  compressionLevel: "none" | "light" | "moderate" | "aggressive";
}

export interface LayoutSection {
  type:
    | "header"
    | "summary"
    | "skills"
    | "experience"
    | "projects"
    | "education"
    | "certifications"
    | "publications"
    | "awards";
  allocatedLines: number;
  items?: {
    id: string;
    bulletCount: number;
  }[];
}

export interface GeneratedResume {
  contact: ContactInfo;
  summary?: string;
  experiences: GeneratedExperience[];
  projects: GeneratedProject[];
  education: Education[];
  skills: SkillCategory[];
  certifications?: Certification[];
  publications?: Publication[];
  awards?: string[];
  layoutPlan: LayoutPlan;
  atsReport: ATSReport;
  jdMatchReport: JDMatchReport;
}

export interface GeneratedExperience extends Experience {
  rewrittenBullets: BulletRewrite[];
  includedInResume: boolean;
}

export interface GeneratedProject extends Project {
  rewrittenBullets: BulletRewrite[];
  includedInResume: boolean;
}

// ============================================
// ATS Compliance Types
// ============================================

export interface ATSRule {
  id: string;
  name: string;
  description: string;
  severity: "error" | "warning" | "info";
}

export interface ATSViolation {
  rule: ATSRule;
  location?: string;
  suggestion?: string;
}

export interface ATSReport {
  passed: boolean;
  score: number; // 0-100
  violations: ATSViolation[];
  warnings: ATSViolation[];
  checkedRules: ATSRule[];
}

// ============================================
// JD Match Report Types
// ============================================

export interface KeywordCoverage {
  keyword: string;
  found: boolean;
  locations: string[]; // e.g., ["summary", "experience.0.bullets.1"]
  importance: "required" | "preferred" | "nice-to-have";
}

export interface JDMatchReport {
  roleMatch: {
    inferred: RoleClassification;
    alignmentScore: number; // 0-100
  };
  keywordCoverage: KeywordCoverage[];
  coverageScore: number; // 0-100, percentage of keywords covered
  skillsMatch: {
    matched: string[];
    missing: string[];
    extra: string[]; // Skills in resume not in JD
  };
  experienceRelevance: {
    totalExperiences: number;
    includedExperiences: number;
    averageRelevance: number;
  };
  projectRelevance: {
    totalProjects: number;
    includedProjects: number;
    averageRelevance: number;
  };
  suggestions: string[];
}

// ============================================
// Export Types
// ============================================

export type ExportFormat = "pdf" | "docx" | "latex" | "txt";

export interface ExportOptions {
  format: ExportFormat;
  fileName?: string;
  includeDebugInfo?: boolean;
}

export interface ExportResult {
  format: ExportFormat;
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

// ============================================
// Configuration Types
// ============================================

export interface ResumeConfig {
  pageCount: 1 | 2;
  includeSections: {
    summary: boolean;
    skills: boolean;
    experience: boolean;
    projects: boolean;
    education: boolean;
    certifications: boolean;
    publications: boolean;
    awards: boolean;
  };
  experienceIds?: string[]; // Specific experiences to include (by default, auto-select)
  projectIds?: string[]; // Specific projects to include
  maxBulletsPerExperience: number; // 2-4
  maxProjects: number; // 1-3
  summaryLength: "short" | "medium" | "long"; // 1-2, 2-3, 3-4 sentences
}

export interface QuestionnaireData {
  contact: ContactInfo;
  summary?: string;
  experiences: Omit<Experience, "id" | "relevanceScore">[];
  projects: Omit<Project, "id" | "relevanceScore">[];
  education: Omit<Education, "id">[];
  skills: SkillCategory[];
  certifications?: Omit<Certification, "id">[];
  publications?: Omit<Publication, "id">[];
  awards?: string[];
}

// ============================================
// API Request/Response Types
// ============================================

export interface UploadRequest {
  resumeFile?: File;
  jdFile?: File;
  jdText?: string;
  supplementaryFiles?: File[];
}

export interface UploadResponse {
  resumeData: ResumeData | null;
  jdAnalysis: JDAnalysis | null;
  errors?: string[];
}

export interface GenerateRequest {
  resumeData: ResumeData;
  jdAnalysis: JDAnalysis;
  config: ResumeConfig;
}

export interface GenerateResponse {
  generatedResume: GeneratedResume;
  processingTime: number;
}

export interface ExportRequest {
  generatedResume: GeneratedResume;
  options: ExportOptions;
}

// ============================================
// UI State Types
// ============================================

export type AppScreen = "input" | "configuration" | "preview";

export interface AppState {
  screen: AppScreen;
  resumeData: ResumeData | null;
  jdAnalysis: JDAnalysis | null;
  config: ResumeConfig;
  generatedResume: GeneratedResume | null;
  isLoading: boolean;
  error: string | null;
}

export const DEFAULT_CONFIG: ResumeConfig = {
  pageCount: 1,
  includeSections: {
    summary: false, // Summary is optional - many strong resumes don't need it
    skills: true,
    experience: true,
    projects: true,
    education: true,
    certifications: true,
    publications: false,
    awards: false,
  },
  maxBulletsPerExperience: 4, // Impact-How bullets can be dense, allow up to 4
  maxProjects: 3,
  summaryLength: "short", // If used, keep it brief
};

