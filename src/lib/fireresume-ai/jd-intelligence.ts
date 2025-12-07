// FireResume AI - JD Intelligence Engine
// Analyzes job descriptions using OpenAI to extract role, level, keywords, and themes

import OpenAI from "openai";
import {
  JDAnalysis,
  RoleType,
  SeniorityLevel,
  Domain,
  SkillCluster,
  ImpactTheme,
  RoleClassification,
} from "@/types/fireresume-ai";

// Lazy initialization of OpenAI client to ensure env vars are loaded
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

// ============================================
// JD Analysis Prompts
// ============================================

const JD_ANALYSIS_SYSTEM_PROMPT = `You are an expert job description analyzer. Your task is to extract structured information from job descriptions to help tailor resumes for ATS systems.

You must return valid JSON matching the exact schema provided. Be precise and thorough in your analysis.

Focus on:
1. Accurately classifying the role type and seniority level
2. Extracting ALL relevant keywords (both explicit and implied)
3. Identifying the domain/industry
4. Categorizing skills by importance (required vs preferred)
5. Detecting impact themes the employer values`;

const JD_ANALYSIS_USER_PROMPT = (jdText: string) => `Analyze this job description and return a JSON object with the following structure:

{
  "jobTitle": "exact job title from the posting",
  "company": "company name if mentioned",
  "roleType": "one of: Product Manager, Software Engineer, Data Scientist, Data Engineer, Machine Learning Engineer, Technical Program Manager, UX Designer, DevOps Engineer, Full Stack Developer, Frontend Developer, Backend Developer, Mobile Developer, QA Engineer, Security Engineer, Solutions Architect, Engineering Manager, Other",
  "seniorityLevel": "one of: Intern, Entry Level, Associate, Mid-Level, Senior, Staff, Principal, Director, VP, Executive",
  "domain": "one of: Finance, Healthcare, E-commerce, Enterprise, Consumer, AI/ML, Gaming, Media, Education, Government, Startup, Agency, Other",
  "yearsExperience": {
    "min": number or null,
    "max": number or null
  },
  "skillClusters": [
    {
      "category": "category name (e.g., Programming Languages, Frameworks, Cloud, Tools, Soft Skills)",
      "skills": ["skill1", "skill2"],
      "importance": "required | preferred | nice-to-have"
    }
  ],
  "primaryKeywords": ["exact phrases from the JD that are critical"],
  "secondaryKeywords": ["related terms and synonyms"],
  "impactThemes": [
    {
      "theme": "theme name (e.g., growth, efficiency, reliability, innovation, scale)",
      "keywords": ["related keywords"],
      "weight": 0.0-1.0
    }
  ],
  "responsibilities": ["key responsibilities"],
  "requirements": ["must-have requirements"],
  "preferredQualifications": ["nice-to-have qualifications"]
}

Job Description:
${jdText}

Return ONLY the JSON object, no additional text.`;

// ============================================
// Main Analysis Functions
// ============================================

/**
 * Analyze a job description using OpenAI
 */
export async function analyzeJD(jdText: string): Promise<JDAnalysis> {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: JD_ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: JD_ANALYSIS_USER_PROMPT(jdText) },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(content);

    // Validate and normalize the response
    return normalizeJDAnalysis(parsed, jdText);
  } catch (error) {
    console.error("Error analyzing JD:", error);

    // Return a basic analysis using regex fallbacks
    return fallbackJDAnalysis(jdText);
  }
}

/**
 * Normalize and validate the JD analysis response
 */
function normalizeJDAnalysis(
  raw: Record<string, unknown>,
  jdText: string
): JDAnalysis {
  return {
    jobTitle: (raw.jobTitle as string) || extractJobTitle(jdText),
    company: (raw.company as string) || undefined,
    roleType: validateRoleType(raw.roleType as string),
    seniorityLevel: validateSeniorityLevel(raw.seniorityLevel as string),
    domain: validateDomain(raw.domain as string),
    yearsExperience: raw.yearsExperience as { min?: number; max?: number },
    skillClusters: normalizeSkillClusters(raw.skillClusters),
    primaryKeywords: (raw.primaryKeywords as string[]) || [],
    secondaryKeywords: (raw.secondaryKeywords as string[]) || [],
    impactThemes: normalizeImpactThemes(raw.impactThemes),
    responsibilities: (raw.responsibilities as string[]) || [],
    requirements: (raw.requirements as string[]) || [],
    preferredQualifications: (raw.preferredQualifications as string[]) || [],
    rawText: jdText,
  };
}

/**
 * Validate role type or return "Other"
 */
function validateRoleType(role: string): RoleType {
  const validRoles: RoleType[] = [
    "Product Manager",
    "Software Engineer",
    "Data Scientist",
    "Data Engineer",
    "Machine Learning Engineer",
    "Technical Program Manager",
    "UX Designer",
    "DevOps Engineer",
    "Full Stack Developer",
    "Frontend Developer",
    "Backend Developer",
    "Mobile Developer",
    "QA Engineer",
    "Security Engineer",
    "Solutions Architect",
    "Engineering Manager",
    "Other",
  ];

  return validRoles.includes(role as RoleType) ? (role as RoleType) : "Other";
}

/**
 * Validate seniority level or return "Mid-Level"
 */
function validateSeniorityLevel(level: string): SeniorityLevel {
  const validLevels: SeniorityLevel[] = [
    "Intern",
    "Entry Level",
    "Associate",
    "Mid-Level",
    "Senior",
    "Staff",
    "Principal",
    "Director",
    "VP",
    "Executive",
  ];

  return validLevels.includes(level as SeniorityLevel)
    ? (level as SeniorityLevel)
    : "Mid-Level";
}

/**
 * Validate domain or return "Other"
 */
function validateDomain(domain: string): Domain {
  const validDomains: Domain[] = [
    "Finance",
    "Healthcare",
    "E-commerce",
    "Enterprise",
    "Consumer",
    "AI/ML",
    "Gaming",
    "Media",
    "Education",
    "Government",
    "Startup",
    "Agency",
    "Other",
  ];

  return validDomains.includes(domain as Domain) ? (domain as Domain) : "Other";
}

/**
 * Normalize skill clusters
 */
function normalizeSkillClusters(raw: unknown): SkillCluster[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((cluster) => ({
    category: cluster.category || "General",
    skills: Array.isArray(cluster.skills) ? cluster.skills : [],
    importance: ["required", "preferred", "nice-to-have"].includes(
      cluster.importance
    )
      ? cluster.importance
      : "preferred",
  }));
}

/**
 * Normalize impact themes
 */
function normalizeImpactThemes(raw: unknown): ImpactTheme[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((theme) => ({
    theme: theme.theme || "general",
    keywords: Array.isArray(theme.keywords) ? theme.keywords : [],
    weight: typeof theme.weight === "number" ? theme.weight : 0.5,
  }));
}

// ============================================
// Fallback Analysis (Regex-based)
// ============================================

/**
 * Extract job title using regex patterns
 */
function extractJobTitle(text: string): string {
  // Common patterns for job titles
  const patterns = [
    /(?:job\s+title|position|role):\s*(.+?)(?:\n|$)/i,
    /^(.+?(?:Engineer|Developer|Manager|Designer|Scientist|Analyst|Architect))/im,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  // Return first line as fallback
  return text.split("\n")[0]?.slice(0, 100) || "Unknown Position";
}

/**
 * Extract keywords using common tech patterns
 */
function extractKeywords(text: string): string[] {
  const keywords: Set<string> = new Set();

  // Common tech keywords pattern
  const techPattern =
    /\b(Python|JavaScript|TypeScript|Java|C\+\+|Go|Rust|Ruby|PHP|Swift|Kotlin|React|Angular|Vue|Node\.js|Django|Flask|Spring|AWS|Azure|GCP|Docker|Kubernetes|SQL|NoSQL|MongoDB|PostgreSQL|Redis|GraphQL|REST|API|CI\/CD|Agile|Scrum|Machine Learning|AI|Deep Learning|TensorFlow|PyTorch|Spark|Hadoop|Kafka|Terraform|Git|Linux|Jenkins|Figma|Jira)\b/gi;

  const matches = text.match(techPattern);
  if (matches) {
    matches.forEach((m) => keywords.add(m));
  }

  return [...keywords];
}

/**
 * Infer seniority level from text
 */
function inferSeniorityLevel(text: string): SeniorityLevel {
  const lowerText = text.toLowerCase();

  if (/\bintern\b/.test(lowerText)) return "Intern";
  if (/\bentry.?level\b|\bjunior\b|\bnew\s+grad\b/.test(lowerText))
    return "Entry Level";
  if (/\bsenior\b|\bsr\.\b/.test(lowerText)) return "Senior";
  if (/\bstaff\b/.test(lowerText)) return "Staff";
  if (/\bprincipal\b|\bstaff\b/.test(lowerText)) return "Principal";
  if (/\bdirector\b/.test(lowerText)) return "Director";
  if (/\bvp\b|\bvice\s+president\b/.test(lowerText)) return "VP";
  if (/\b(?:5|6|7|8|9|10)\+?\s*(?:years?|yrs?)\b/.test(lowerText))
    return "Senior";
  if (/\b(?:3|4)\+?\s*(?:years?|yrs?)\b/.test(lowerText)) return "Mid-Level";

  return "Mid-Level";
}

/**
 * Infer role type from text
 */
function inferRoleType(text: string): RoleType {
  const lowerText = text.toLowerCase();

  if (/product\s+manag/i.test(lowerText)) return "Product Manager";
  if (/data\s+scien/i.test(lowerText)) return "Data Scientist";
  if (/machine\s+learning|ml\s+engineer/i.test(lowerText))
    return "Machine Learning Engineer";
  if (/data\s+engineer/i.test(lowerText)) return "Data Engineer";
  if (/full\s*stack/i.test(lowerText)) return "Full Stack Developer";
  if (/front\s*end|frontend/i.test(lowerText)) return "Frontend Developer";
  if (/back\s*end|backend/i.test(lowerText)) return "Backend Developer";
  if (/devops|sre|site\s+reliability/i.test(lowerText)) return "DevOps Engineer";
  if (/mobile|ios|android/i.test(lowerText)) return "Mobile Developer";
  if (/ux|user\s+experience|product\s+design/i.test(lowerText))
    return "UX Designer";
  if (/qa|quality|test/i.test(lowerText)) return "QA Engineer";
  if (/security|cybersecurity/i.test(lowerText)) return "Security Engineer";
  if (/architect/i.test(lowerText)) return "Solutions Architect";
  if (/engineering\s+manag/i.test(lowerText)) return "Engineering Manager";
  if (/technical\s+program|tpm/i.test(lowerText))
    return "Technical Program Manager";
  if (/software|engineer|developer/i.test(lowerText)) return "Software Engineer";

  return "Other";
}

/**
 * Fallback JD analysis using regex patterns
 */
function fallbackJDAnalysis(jdText: string): JDAnalysis {
  const keywords = extractKeywords(jdText);

  return {
    jobTitle: extractJobTitle(jdText),
    roleType: inferRoleType(jdText),
    seniorityLevel: inferSeniorityLevel(jdText),
    domain: "Other",
    skillClusters: [
      {
        category: "Technical Skills",
        skills: keywords,
        importance: "required",
      },
    ],
    primaryKeywords: keywords.slice(0, 10),
    secondaryKeywords: keywords.slice(10),
    impactThemes: [],
    responsibilities: [],
    requirements: [],
    preferredQualifications: [],
    rawText: jdText,
  };
}

// ============================================
// Additional Analysis Functions
// ============================================

/**
 * Classify role from JD text
 */
export async function classifyRole(jdText: string): Promise<RoleClassification> {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a job role classifier. Return JSON with roleType, seniorityLevel, domain, and confidence (0-1).",
        },
        {
          role: "user",
          content: `Classify this job: ${jdText.slice(0, 1000)}`,
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response");

    const parsed = JSON.parse(content);
    return {
      roleType: validateRoleType(parsed.roleType),
      seniorityLevel: validateSeniorityLevel(parsed.seniorityLevel),
      domain: validateDomain(parsed.domain),
      confidence: parsed.confidence || 0.7,
    };
  } catch {
    return {
      roleType: inferRoleType(jdText),
      seniorityLevel: inferSeniorityLevel(jdText),
      domain: "Other",
      confidence: 0.5,
    };
  }
}

/**
 * Infer experience level from JD
 */
export async function inferLevel(
  jdText: string
): Promise<{ level: SeniorityLevel; yearsMin?: number; yearsMax?: number }> {
  // Extract years of experience mentioned
  const yearsMatch = jdText.match(/(\d+)\+?\s*(?:-\s*(\d+))?\s*years?/i);

  let yearsMin: number | undefined;
  let yearsMax: number | undefined;

  if (yearsMatch) {
    yearsMin = parseInt(yearsMatch[1], 10);
    yearsMax = yearsMatch[2] ? parseInt(yearsMatch[2], 10) : undefined;
  }

  const level = inferSeniorityLevel(jdText);

  return { level, yearsMin, yearsMax };
}

/**
 * Extract all keywords from JD
 */
export function extractAllKeywords(jdText: string): {
  primary: string[];
  secondary: string[];
} {
  const keywords = extractKeywords(jdText);

  // Primary keywords appear in requirements or are mentioned multiple times
  const wordCounts = new Map<string, number>();
  const lowerText = jdText.toLowerCase();

  for (const keyword of keywords) {
    const regex = new RegExp(keyword.toLowerCase(), "gi");
    const count = (lowerText.match(regex) || []).length;
    wordCounts.set(keyword, count);
  }

  // Sort by frequency
  const sorted = [...wordCounts.entries()].sort((a, b) => b[1] - a[1]);

  const primary = sorted.slice(0, 10).map(([k]) => k);
  const secondary = sorted.slice(10, 25).map(([k]) => k);

  return { primary, secondary };
}

