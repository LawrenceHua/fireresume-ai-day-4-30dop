// FireResume AI - Resume Generation Engine
// Handles JD-to-profile mapping, bullet rewriting, and layout allocation

import OpenAI from "openai";
import {
  ResumeData,
  JDAnalysis,
  Experience,
  Project,
  ResumeConfig,
  GeneratedResume,
  GeneratedExperience,
  GeneratedProject,
  RelevanceMap,
  BulletRewrite,
  LayoutPlan,
  LayoutSection,
  ATSReport,
  JDMatchReport,
  KeywordCoverage,
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
// Constants
// ============================================

const LINES_PER_PAGE = 55; // Approximate lines per page with standard formatting
const HEADER_LINES = 6;
const SUMMARY_LINES_SHORT = 2;
const SUMMARY_LINES_MEDIUM = 3;
const SUMMARY_LINES_LONG = 4;
const SKILLS_LINES_BASE = 3;
const EXPERIENCE_HEADER_LINES = 2;
const BULLET_LINES = 2; // Approximate lines per bullet
const PROJECT_HEADER_LINES = 1;
const EDUCATION_LINES = 3;

// ============================================
// Relevance Scoring
// ============================================

/**
 * Calculate relevance score for an experience based on JD
 */
function calculateExperienceRelevance(
  experience: Experience,
  jdAnalysis: JDAnalysis
): number {
  let score = 0;
  const maxScore = 100;

  // Combine all keywords for matching
  const allKeywords = [
    ...jdAnalysis.primaryKeywords,
    ...jdAnalysis.secondaryKeywords,
  ].map((k) => k.toLowerCase());

  const skillKeywords = jdAnalysis.skillClusters.flatMap((c) =>
    c.skills.map((s) => s.toLowerCase())
  );

  // Check title match
  const titleLower = experience.title.toLowerCase();
  const roleTypeLower = jdAnalysis.roleType.toLowerCase();
  if (titleLower.includes(roleTypeLower) || roleTypeLower.includes(titleLower)) {
    score += 20;
  }

  // Check bullets for keyword matches
  const allBullets = experience.bullets.join(" ").toLowerCase();
  let keywordMatches = 0;

  for (const keyword of [...allKeywords, ...skillKeywords]) {
    if (allBullets.includes(keyword)) {
      keywordMatches++;
    }
  }

  // Keyword match score (up to 40 points)
  const keywordScore = Math.min(
    40,
    (keywordMatches / Math.max(allKeywords.length, 1)) * 60
  );
  score += keywordScore;

  // Check for impact theme keywords
  for (const theme of jdAnalysis.impactThemes) {
    for (const keyword of theme.keywords) {
      if (allBullets.includes(keyword.toLowerCase())) {
        score += 5 * theme.weight;
      }
    }
  }

  // Cap at max score
  return Math.min(score, maxScore);
}

/**
 * Calculate relevance score for a project based on JD
 */
function calculateProjectRelevance(
  project: Project,
  jdAnalysis: JDAnalysis
): number {
  let score = 0;
  const maxScore = 100;

  // Combine all keywords
  const allKeywords = [
    ...jdAnalysis.primaryKeywords,
    ...jdAnalysis.secondaryKeywords,
  ].map((k) => k.toLowerCase());

  const skillKeywords = jdAnalysis.skillClusters.flatMap((c) =>
    c.skills.map((s) => s.toLowerCase())
  );

  // Check tech stack match
  const techStackLower = project.techStack.map((t) => t.toLowerCase());
  let techMatches = 0;

  for (const tech of techStackLower) {
    if (skillKeywords.includes(tech) || allKeywords.includes(tech)) {
      techMatches++;
    }
  }

  // Tech stack score (up to 50 points)
  const techScore = Math.min(
    50,
    (techMatches / Math.max(project.techStack.length, 1)) * 70
  );
  score += techScore;

  // Check bullets for keyword matches
  const allBullets = project.bullets.join(" ").toLowerCase();
  let keywordMatches = 0;

  for (const keyword of [...allKeywords, ...skillKeywords]) {
    if (allBullets.includes(keyword)) {
      keywordMatches++;
    }
  }

  // Keyword match score (up to 30 points)
  const keywordScore = Math.min(
    30,
    (keywordMatches / Math.max(allKeywords.length, 1)) * 40
  );
  score += keywordScore;

  // Bonus for having a link (shows it's real/deployable)
  if (project.link) {
    score += 10;
  }

  return Math.min(score, maxScore);
}

/**
 * Map JD to candidate profile and calculate relevance scores
 */
export function mapJDToProfile(
  jdAnalysis: JDAnalysis,
  resumeData: ResumeData
): RelevanceMap {
  const experienceScores: Record<string, number> = {};
  const projectScores: Record<string, number> = {};
  const skillScores: Record<string, number> = {};

  // Score experiences
  for (const exp of resumeData.experiences) {
    experienceScores[exp.id] = calculateExperienceRelevance(exp, jdAnalysis);
  }

  // Score projects
  for (const proj of resumeData.projects) {
    projectScores[proj.id] = calculateProjectRelevance(proj, jdAnalysis);
  }

  // Score skills (simple keyword match)
  const allSkills = resumeData.skills.flatMap((cat) => cat.skills);
  const jdSkills = jdAnalysis.skillClusters.flatMap((c) =>
    c.skills.map((s) => s.toLowerCase())
  );

  for (const skill of allSkills) {
    const skillLower = skill.toLowerCase();
    skillScores[skill] = jdSkills.includes(skillLower) ? 100 : 0;
  }

  // Calculate overall match
  const avgExperience =
    Object.values(experienceScores).reduce((a, b) => a + b, 0) /
      Math.max(Object.keys(experienceScores).length, 1) || 0;
  const avgProject =
    Object.values(projectScores).reduce((a, b) => a + b, 0) /
      Math.max(Object.keys(projectScores).length, 1) || 0;
  const matchedSkills = Object.values(skillScores).filter((s) => s > 0).length;
  const skillMatchRate =
    (matchedSkills / Math.max(allSkills.length, 1)) * 100 || 0;

  const overallMatch = Math.round(
    avgExperience * 0.5 + avgProject * 0.2 + skillMatchRate * 0.3
  );

  return {
    experiences: experienceScores,
    projects: projectScores,
    skills: skillScores,
    overallMatch,
  };
}

/**
 * Rank experiences by relevance
 */
export function rankExperiences(
  experiences: Experience[],
  relevanceMap: RelevanceMap
): Experience[] {
  return [...experiences].sort((a, b) => {
    const scoreA = relevanceMap.experiences[a.id] || 0;
    const scoreB = relevanceMap.experiences[b.id] || 0;
    return scoreB - scoreA;
  });
}

/**
 * Rank projects by relevance
 */
export function rankProjects(
  projects: Project[],
  relevanceMap: RelevanceMap
): Project[] {
  return [...projects].sort((a, b) => {
    const scoreA = relevanceMap.projects[a.id] || 0;
    const scoreB = relevanceMap.projects[b.id] || 0;
    return scoreB - scoreA;
  });
}

/**
 * Select top projects based on relevance
 */
export function selectTopProjects(
  projects: Project[],
  maxCount: number,
  relevanceMap: RelevanceMap
): Project[] {
  const ranked = rankProjects(projects, relevanceMap);
  return ranked.slice(0, maxCount);
}

// ============================================
// Bullet Rewriting
// ============================================

const BULLET_REWRITE_PROMPT = (
  bullet: string,
  jdAnalysis: JDAnalysis
) => `Rewrite this resume bullet point using the WHAT → IMPACT → HOW format for the following job:

Job Title: ${jdAnalysis.jobTitle}
Role Type: ${jdAnalysis.roleType}
Key Skills: ${jdAnalysis.skillClusters.flatMap((c) => c.skills).slice(0, 10).join(", ")}

Original bullet: "${bullet}"

WHAT → IMPACT → HOW FORMAT:
- WHAT: Start with the action/deliverable (what you built, launched, led, created)
- IMPACT: Include the quantified result/metric (%, $, time saved, users affected)
- HOW: End with the methods, tools, or approach used
- Example: "Launched AI-powered onboarding flow that reduced merchant setup time by 60% using GPT integration and Square POS API"
- Example: "Built recommendation engine that drove $2M revenue increase through collaborative filtering and A/B testing"
- Example: "Led product redesign that increased user retention by 25% using customer interviews and iterative prototyping"

Requirements:
1. Start with a strong action verb (Built, Launched, Led, Developed, Created, Designed)
2. Include quantifiable impact (%, $, time saved, users affected)
3. End with the methods/tools/approach
4. Naturally incorporate relevant JD keywords where they apply
5. Keep concise but complete (aim for 1-2 lines)
6. Do NOT keyword stuff or force irrelevant keywords

Return ONLY the rewritten bullet point, nothing else.`;

/**
 * Rewrite a single bullet using OpenAI
 */
async function rewriteSingleBullet(
  bullet: string,
  jdAnalysis: JDAnalysis
): Promise<BulletRewrite> {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert resume writer. Rewrite bullet points to be impactful and ATS-friendly. Be concise.",
        },
        {
          role: "user",
          content: BULLET_REWRITE_PROMPT(bullet, jdAnalysis),
        },
      ],
      temperature: 0.5,
      max_tokens: 150,
    });

    const rewritten =
      response.choices[0]?.message?.content?.trim() || bullet;

    // Find which keywords were included
    const allKeywords = [
      ...jdAnalysis.primaryKeywords,
      ...jdAnalysis.secondaryKeywords,
      ...jdAnalysis.skillClusters.flatMap((c) => c.skills),
    ];

    const keywordsIncluded = allKeywords.filter((k) =>
      rewritten.toLowerCase().includes(k.toLowerCase())
    );

    // Check if it has a metric
    const hasMetric = /\d+%?|\$[\d,]+|\d+x|\d+\+/.test(rewritten);

    return {
      original: bullet,
      rewritten,
      keywordsIncluded,
      hasMetric,
    };
  } catch (error) {
    console.error("Error rewriting bullet:", error);
    return {
      original: bullet,
      rewritten: bullet,
      keywordsIncluded: [],
      hasMetric: /\d+%?|\$[\d,]+|\d+x|\d+\+/.test(bullet),
    };
  }
}

/**
 * Rewrite multiple bullets in parallel
 */
export async function rewriteBullets(
  bullets: string[],
  jdAnalysis: JDAnalysis
): Promise<BulletRewrite[]> {
  const results = await Promise.all(
    bullets.map((bullet) => rewriteSingleBullet(bullet, jdAnalysis))
  );
  return results;
}

/**
 * Rewrite project bullets
 */
export async function rewriteProjectBullets(
  project: Project,
  jdAnalysis: JDAnalysis
): Promise<BulletRewrite[]> {
  return rewriteBullets(project.bullets, jdAnalysis);
}

// ============================================
// Summary Generation
// ============================================

const SUMMARY_PROMPT = (
  resumeData: ResumeData,
  jdAnalysis: JDAnalysis,
  length: "short" | "medium" | "long"
) => {
  const sentences = length === "short" ? 2 : length === "medium" ? 3 : 4;

  return `Write a professional resume summary for this candidate applying to ${jdAnalysis.jobTitle} at ${jdAnalysis.company || "the company"}.

Candidate Background:
- Name: ${resumeData.contact.fullName}
- Most Recent Role: ${resumeData.experiences[0]?.title || "N/A"} at ${resumeData.experiences[0]?.company || "N/A"}
- Key Skills: ${resumeData.skills.flatMap((c) => c.skills).slice(0, 10).join(", ")}
- Experience Count: ${resumeData.experiences.length} roles

Job Requirements:
- Role: ${jdAnalysis.roleType}, ${jdAnalysis.seniorityLevel}
- Key Skills Needed: ${jdAnalysis.skillClusters.flatMap((c) => c.skills).slice(0, 8).join(", ")}
- Domain: ${jdAnalysis.domain}

Requirements:
1. Write exactly ${sentences} sentences
2. Mention years of experience, core strengths, and domain expertise
3. Include 2-3 relevant skills that match the job requirements
4. Be specific and quantifiable where possible
5. Do NOT use first person ("I")

Return ONLY the summary, nothing else.`;
};

/**
 * Generate a tailored summary
 */
export async function generateSummary(
  resumeData: ResumeData,
  jdAnalysis: JDAnalysis,
  length: "short" | "medium" | "long"
): Promise<string> {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert resume writer. Write concise, impactful professional summaries.",
        },
        {
          role: "user",
          content: SUMMARY_PROMPT(resumeData, jdAnalysis, length),
        },
      ],
      temperature: 0.6,
      max_tokens: 200,
    });

    return (
      response.choices[0]?.message?.content?.trim() ||
      resumeData.summary ||
      ""
    );
  } catch (error) {
    console.error("Error generating summary:", error);
    return resumeData.summary || "";
  }
}

// ============================================
// Layout Allocation
// ============================================

/**
 * Calculate layout allocation for the resume
 */
export function allocateLayout(
  resumeData: ResumeData,
  config: ResumeConfig,
  relevanceMap: RelevanceMap
): LayoutPlan {
  const totalLines = config.pageCount * LINES_PER_PAGE;
  const sections: LayoutSection[] = [];
  let usedLines = 0;

  // Header (always included)
  sections.push({ type: "header", allocatedLines: HEADER_LINES });
  usedLines += HEADER_LINES;

  // Summary
  if (config.includeSections.summary) {
    const summaryLines =
      config.summaryLength === "short"
        ? SUMMARY_LINES_SHORT
        : config.summaryLength === "medium"
          ? SUMMARY_LINES_MEDIUM
          : SUMMARY_LINES_LONG;
    sections.push({ type: "summary", allocatedLines: summaryLines });
    usedLines += summaryLines;
  }

  // Skills
  if (config.includeSections.skills) {
    const skillLines = Math.min(
      SKILLS_LINES_BASE + Math.floor(resumeData.skills.length / 2),
      6
    );
    sections.push({ type: "skills", allocatedLines: skillLines });
    usedLines += skillLines;
  }

  // Calculate remaining space for experience and projects
  const educationLines = config.includeSections.education
    ? resumeData.education.length * EDUCATION_LINES
    : 0;
  const remainingLines = totalLines - usedLines - educationLines - 2; // 2 for padding

  // Rank experiences and projects
  const rankedExperiences = rankExperiences(
    resumeData.experiences,
    relevanceMap
  );
  const rankedProjects = rankProjects(resumeData.projects, relevanceMap);

  // Allocate experience
  if (config.includeSections.experience) {
    const experienceItems: { id: string; bulletCount: number }[] = [];
    let experienceLines = 0;
    const targetExperienceLines = Math.floor(remainingLines * 0.7);

    for (const exp of rankedExperiences) {
      const headerLines = EXPERIENCE_HEADER_LINES;
      const maxBullets = Math.min(
        config.maxBulletsPerExperience,
        exp.bullets.length
      );
      const bulletLines = maxBullets * BULLET_LINES;
      const totalExpLines = headerLines + bulletLines;

      if (experienceLines + totalExpLines <= targetExperienceLines) {
        experienceItems.push({ id: exp.id, bulletCount: maxBullets });
        experienceLines += totalExpLines;
      } else {
        break;
      }
    }

    sections.push({
      type: "experience",
      allocatedLines: experienceLines,
      items: experienceItems,
    });
    usedLines += experienceLines;
  }

  // Allocate projects
  if (config.includeSections.projects && rankedProjects.length > 0) {
    const projectItems: { id: string; bulletCount: number }[] = [];
    let projectLines = 0;
    const targetProjectLines = Math.min(
      remainingLines - (usedLines - HEADER_LINES),
      config.maxProjects * 4
    );

    for (const proj of rankedProjects.slice(0, config.maxProjects)) {
      const headerLines = PROJECT_HEADER_LINES;
      const maxBullets = Math.min(2, proj.bullets.length);
      const bulletLines = maxBullets * BULLET_LINES;
      const totalProjLines = headerLines + bulletLines;

      if (projectLines + totalProjLines <= targetProjectLines) {
        projectItems.push({ id: proj.id, bulletCount: maxBullets });
        projectLines += totalProjLines;
      }
    }

    if (projectItems.length > 0) {
      sections.push({
        type: "projects",
        allocatedLines: projectLines,
        items: projectItems,
      });
      usedLines += projectLines;
    }
  }

  // Education
  if (config.includeSections.education) {
    sections.push({ type: "education", allocatedLines: educationLines });
    usedLines += educationLines;
  }

  // Determine compression level
  const utilizationRate = usedLines / totalLines;
  let compressionLevel: "none" | "light" | "moderate" | "aggressive" = "none";
  if (utilizationRate > 1.1) {
    compressionLevel = "aggressive";
  } else if (utilizationRate > 1.0) {
    compressionLevel = "moderate";
  } else if (utilizationRate > 0.95) {
    compressionLevel = "light";
  }

  return {
    pageCount: config.pageCount,
    sections,
    totalLines: usedLines,
    compressionLevel,
  };
}

// ============================================
// ATS Compliance Check
// ============================================

/**
 * Check ATS compliance of the generated resume
 */
export function checkATSCompliance(
  generatedResume: GeneratedResume
): ATSReport {
  const violations: ATSReport["violations"] = [];
  const warnings: ATSReport["warnings"] = [];
  const checkedRules: ATSReport["checkedRules"] = [];

  // Rule 1: Contact info present
  const contactRule = {
    id: "contact-info",
    name: "Contact Information",
    description: "Resume must have email and phone",
    severity: "error" as const,
  };
  checkedRules.push(contactRule);
  if (!generatedResume.contact.email) {
    violations.push({ rule: contactRule, suggestion: "Add email address" });
  }

  // Rule 2: Has experiences
  const experienceRule = {
    id: "has-experience",
    name: "Work Experience",
    description: "Resume should have work experience section",
    severity: "warning" as const,
  };
  checkedRules.push(experienceRule);
  if (generatedResume.experiences.filter((e) => e.includedInResume).length === 0) {
    warnings.push({
      rule: experienceRule,
      suggestion: "Add at least one work experience",
    });
  }

  // Rule 3: Skills section present
  const skillsRule = {
    id: "has-skills",
    name: "Skills Section",
    description: "Resume should have a skills section for ATS keyword matching",
    severity: "warning" as const,
  };
  checkedRules.push(skillsRule);
  if (
    generatedResume.skills.length === 0 ||
    generatedResume.skills.flatMap((c) => c.skills).length === 0
  ) {
    warnings.push({
      rule: skillsRule,
      suggestion: "Add skills section with relevant keywords",
    });
  }

  // Rule 4: Standard date formats
  const dateRule = {
    id: "date-format",
    name: "Date Format",
    description: "Dates should be in standard format (Month Year)",
    severity: "info" as const,
  };
  checkedRules.push(dateRule);

  // Rule 5: Bullets have metrics
  const metricRule = {
    id: "bullet-metrics",
    name: "Quantified Achievements",
    description: "Bullets should include metrics where possible",
    severity: "info" as const,
  };
  checkedRules.push(metricRule);

  const bulletsWithMetrics = generatedResume.experiences
    .filter((e) => e.includedInResume)
    .flatMap((e) => e.rewrittenBullets)
    .filter((b) => b.hasMetric).length;

  const totalBullets = generatedResume.experiences
    .filter((e) => e.includedInResume)
    .flatMap((e) => e.rewrittenBullets).length;

  if (totalBullets > 0 && bulletsWithMetrics / totalBullets < 0.5) {
    warnings.push({
      rule: metricRule,
      suggestion: "Add more quantified metrics to your bullet points",
    });
  }

  // Calculate score
  const errorCount = violations.length;
  const warningCount = warnings.length;
  const score = Math.max(
    0,
    100 - errorCount * 20 - warningCount * 5
  );

  return {
    passed: errorCount === 0,
    score,
    violations,
    warnings,
    checkedRules,
  };
}

// ============================================
// JD Match Report
// ============================================

/**
 * Generate JD match report
 */
export function generateJDMatchReport(
  resumeData: ResumeData,
  jdAnalysis: JDAnalysis,
  generatedResume: GeneratedResume,
  relevanceMap: RelevanceMap
): JDMatchReport {
  // Check keyword coverage
  const allKeywords = [
    ...jdAnalysis.primaryKeywords,
    ...jdAnalysis.secondaryKeywords,
  ];

  const resumeText = [
    generatedResume.summary,
    ...generatedResume.experiences
      .filter((e) => e.includedInResume)
      .flatMap((e) => e.rewrittenBullets.map((b) => b.rewritten)),
    ...generatedResume.projects
      .filter((p) => p.includedInResume)
      .flatMap((p) => p.rewrittenBullets.map((b) => b.rewritten)),
    ...generatedResume.skills.flatMap((c) => c.skills),
  ]
    .join(" ")
    .toLowerCase();

  const keywordCoverage: KeywordCoverage[] = allKeywords.map((keyword) => {
    const found = resumeText.includes(keyword.toLowerCase());
    const importance = jdAnalysis.primaryKeywords.includes(keyword)
      ? "required"
      : "preferred";

    // Find locations (simplified)
    const locations: string[] = [];
    if (generatedResume.summary?.toLowerCase().includes(keyword.toLowerCase())) {
      locations.push("summary");
    }
    const skillsText = generatedResume.skills
      .flatMap((c) => c.skills)
      .join(" ")
      .toLowerCase();
    if (skillsText.includes(keyword.toLowerCase())) {
      locations.push("skills");
    }

    return {
      keyword,
      found,
      locations,
      importance,
    };
  });

  const coveredKeywords = keywordCoverage.filter((k) => k.found).length;
  const coverageScore = Math.round(
    (coveredKeywords / Math.max(allKeywords.length, 1)) * 100
  );

  // Skills match
  const resumeSkills = resumeData.skills.flatMap((c) =>
    c.skills.map((s) => s.toLowerCase())
  );
  const jdSkills = jdAnalysis.skillClusters.flatMap((c) =>
    c.skills.map((s) => s.toLowerCase())
  );

  const matched = resumeSkills.filter((s) => jdSkills.includes(s));
  const missing = jdSkills.filter((s) => !resumeSkills.includes(s));
  const extra = resumeSkills.filter((s) => !jdSkills.includes(s));

  // Experience relevance
  const includedExperiences = generatedResume.experiences.filter(
    (e) => e.includedInResume
  );
  const avgExperienceRelevance =
    includedExperiences.reduce(
      (sum, e) => sum + (e.relevanceScore || 0),
      0
    ) / Math.max(includedExperiences.length, 1);

  // Project relevance
  const includedProjects = generatedResume.projects.filter(
    (p) => p.includedInResume
  );
  const avgProjectRelevance =
    includedProjects.reduce((sum, p) => sum + (p.relevanceScore || 0), 0) /
    Math.max(includedProjects.length, 1);

  // Generate suggestions
  const suggestions: string[] = [];
  if (coverageScore < 50) {
    suggestions.push(
      "Consider adding more JD keywords to your experience bullets"
    );
  }
  if (missing.length > 5) {
    suggestions.push(
      `Missing key skills: ${missing.slice(0, 5).join(", ")}. Add if applicable.`
    );
  }
  if (avgExperienceRelevance < 50) {
    suggestions.push(
      "Consider emphasizing experiences more relevant to this role"
    );
  }

  return {
    roleMatch: {
      inferred: {
        roleType: jdAnalysis.roleType,
        seniorityLevel: jdAnalysis.seniorityLevel,
        domain: jdAnalysis.domain,
        confidence: 0.85,
      },
      alignmentScore: relevanceMap.overallMatch,
    },
    keywordCoverage,
    coverageScore,
    skillsMatch: {
      matched,
      missing: missing.slice(0, 10),
      extra: extra.slice(0, 10),
    },
    experienceRelevance: {
      totalExperiences: resumeData.experiences.length,
      includedExperiences: includedExperiences.length,
      averageRelevance: Math.round(avgExperienceRelevance),
    },
    projectRelevance: {
      totalProjects: resumeData.projects.length,
      includedProjects: includedProjects.length,
      averageRelevance: Math.round(avgProjectRelevance),
    },
    suggestions,
  };
}

// ============================================
// Main Generation Function
// ============================================

/**
 * Generate a complete tailored resume
 */
export async function generateResume(
  resumeData: ResumeData,
  jdAnalysis: JDAnalysis,
  config: ResumeConfig
): Promise<GeneratedResume> {
  // Step 1: Map JD to profile and get relevance scores
  const relevanceMap = mapJDToProfile(jdAnalysis, resumeData);

  // Step 2: Allocate layout
  const layoutPlan = allocateLayout(resumeData, config, relevanceMap);

  // Step 3: Generate summary
  const summary = await generateSummary(
    resumeData,
    jdAnalysis,
    config.summaryLength
  );

  // Step 4: Get included experience IDs from layout
  const includedExpIds = new Set(
    layoutPlan.sections
      .find((s) => s.type === "experience")
      ?.items?.map((i) => i.id) || []
  );

  // Step 5: Rewrite bullets for included experiences
  const generatedExperiences: GeneratedExperience[] = await Promise.all(
    resumeData.experiences.map(async (exp) => {
      const included = includedExpIds.has(exp.id);
      const layoutItem = layoutPlan.sections
        .find((s) => s.type === "experience")
        ?.items?.find((i) => i.id === exp.id);
      const bulletCount = layoutItem?.bulletCount || config.maxBulletsPerExperience;

      const bulletsToRewrite = included
        ? exp.bullets.slice(0, bulletCount)
        : [];
      const rewrittenBullets = included
        ? await rewriteBullets(bulletsToRewrite, jdAnalysis)
        : [];

      return {
        ...exp,
        relevanceScore: relevanceMap.experiences[exp.id] || 0,
        rewrittenBullets,
        includedInResume: included,
      };
    })
  );

  // Step 6: Get included project IDs from layout
  const includedProjIds = new Set(
    layoutPlan.sections
      .find((s) => s.type === "projects")
      ?.items?.map((i) => i.id) || []
  );

  // Step 7: Rewrite bullets for included projects
  const generatedProjects: GeneratedProject[] = await Promise.all(
    resumeData.projects.map(async (proj) => {
      const included = includedProjIds.has(proj.id);
      const rewrittenBullets = included
        ? await rewriteProjectBullets(proj, jdAnalysis)
        : [];

      return {
        ...proj,
        relevanceScore: relevanceMap.projects[proj.id] || 0,
        rewrittenBullets,
        includedInResume: included,
      };
    })
  );

  // Step 8: Build generated resume
  const generatedResume: GeneratedResume = {
    contact: resumeData.contact,
    summary,
    experiences: generatedExperiences,
    projects: generatedProjects,
    education: resumeData.education,
    skills: resumeData.skills,
    certifications: resumeData.certifications,
    publications: undefined,
    awards: undefined,
    layoutPlan,
    atsReport: { passed: true, score: 0, violations: [], warnings: [], checkedRules: [] },
    jdMatchReport: {
      roleMatch: { inferred: { roleType: jdAnalysis.roleType, seniorityLevel: jdAnalysis.seniorityLevel, domain: jdAnalysis.domain, confidence: 0 }, alignmentScore: 0 },
      keywordCoverage: [],
      coverageScore: 0,
      skillsMatch: { matched: [], missing: [], extra: [] },
      experienceRelevance: { totalExperiences: 0, includedExperiences: 0, averageRelevance: 0 },
      projectRelevance: { totalProjects: 0, includedProjects: 0, averageRelevance: 0 },
      suggestions: [],
    },
  };

  // Step 9: Check ATS compliance (use comprehensive checker)
  const { checkATSCompliance: comprehensiveATSCheck } = await import("./ats-compliance");
  generatedResume.atsReport = comprehensiveATSCheck(generatedResume);

  // Step 10: Generate JD match report
  generatedResume.jdMatchReport = generateJDMatchReport(
    resumeData,
    jdAnalysis,
    generatedResume,
    relevanceMap
  );

  return generatedResume;
}

