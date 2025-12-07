// FireResume AI - AI-First Resume Parser
// Uses OpenAI to intelligently parse and structure resume data

import OpenAI from "openai";
import { ResumeData, ContactInfo, Experience, Project, Education, SkillCategory } from "@/types/fireresume-ai";

// Lazy initialization of OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

const RESUME_PARSE_PROMPT = `You are an expert resume parser. Extract ALL information from this resume into a structured JSON format.

CRITICAL RULES:
1. Extract EVERY piece of information accurately - do not summarize or skip anything
2. Keep bullet points EXACTLY as written - do not modify or combine them
3. For each job/experience, extract ALL bullet points separately
4. Education entries should include degree, institution, location, graduation date, concentration/focus areas, and any awards/honors
5. Skills should be grouped by category (Languages, Frameworks, Tools, Databases, Cloud, Methods, etc.)
6. Projects should include title, tech stack, link if present, and all bullet points
7. Contact info should include name, email, phone, location, LinkedIn, portfolio/website, GitHub

OUTPUT FORMAT (JSON):
{
  "contact": {
    "fullName": "string",
    "email": "string",
    "phone": "string (optional)",
    "location": "string (City, State)",
    "linkedin": "string (full URL, optional)",
    "portfolio": "string (full URL, optional)",
    "github": "string (full URL, optional)"
  },
  "education": [
    {
      "degree": "string (e.g., Master of Information Systems Management)",
      "institution": "string (e.g., Carnegie Mellon University)",
      "location": "string (e.g., Pittsburgh, PA)",
      "graduationDate": "string (e.g., Dec 2024)",
      "concentration": "string (optional, e.g., IT Strategy and Management, AI & ML)",
      "awards": "string (optional, e.g., Dean's List, McGinnis V.C. Finalist)",
      "gpa": "string (optional)"
    }
  ],
  "experiences": [
    {
      "title": "string (job title)",
      "company": "string (company name)",
      "location": "string (City, State or Remote)",
      "startDate": "string (e.g., Sept 2025)",
      "endDate": "string (e.g., Present)",
      "bullets": ["string array - each bullet point as a separate item, VERBATIM from resume"]
    }
  ],
  "projects": [
    {
      "title": "string (project name)",
      "techStack": ["string array of technologies used"],
      "link": "string (URL, optional)",
      "bullets": ["string array - each bullet point as a separate item"]
    }
  ],
  "skills": [
    {
      "category": "string (e.g., Languages, Frameworks, Tools, Cloud, Methods)",
      "skills": ["string array of individual skills"]
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown, no explanations.`;

/**
 * Parse resume using AI - much more accurate than regex
 */
export async function parseResumeWithAI(resumeText: string): Promise<ResumeData> {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: RESUME_PARSE_PROMPT,
        },
        {
          role: "user",
          content: `Parse this resume and extract ALL information:\n\n${resumeText}`,
        },
      ],
      temperature: 0.1, // Low temperature for accuracy
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI parser");
    }

    const parsed = JSON.parse(content);

    // Transform to our ResumeData format with IDs
    const resumeData: ResumeData = {
      contact: {
        fullName: parsed.contact?.fullName || "Unknown",
        email: parsed.contact?.email || "",
        phone: parsed.contact?.phone,
        location: parsed.contact?.location,
        linkedin: parsed.contact?.linkedin,
        portfolio: parsed.contact?.portfolio,
        github: parsed.contact?.github,
      },
      education: (parsed.education || []).map((edu: any) => ({
        id: generateId(),
        degree: edu.degree || "",
        institution: edu.institution || "",
        location: edu.location,
        graduationDate: edu.graduationDate || "",
        concentration: edu.concentration,
        awards: edu.awards,
        gpa: edu.gpa,
      })),
      experiences: (parsed.experiences || []).map((exp: any) => ({
        id: generateId(),
        title: exp.title || "",
        company: exp.company || "",
        location: exp.location,
        startDate: exp.startDate || "",
        endDate: exp.endDate || "",
        bullets: exp.bullets || [],
      })),
      projects: (parsed.projects || []).map((proj: any) => ({
        id: generateId(),
        title: proj.title || "",
        techStack: proj.techStack || [],
        link: proj.link,
        bullets: proj.bullets || [],
      })),
      skills: (parsed.skills || []).map((cat: any) => ({
        category: cat.category || "Technical Skills",
        skills: cat.skills || [],
      })),
      rawText: resumeText,
    };

    console.log(`[AI Parser] Extracted: ${resumeData.education.length} education, ${resumeData.experiences.length} experiences, ${resumeData.projects.length} projects, ${resumeData.skills.length} skill categories`);

    return resumeData;
  } catch (error) {
    console.error("AI Resume parsing error:", error);
    throw new Error(`Failed to parse resume with AI: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Generate a tailored resume using AI in one shot
 * This takes the original resume + JD and outputs a perfectly formatted resume
 */
export async function generateTailoredResumeWithAI(
  resumeText: string,
  jdText: string,
  config: {
    pageCount: number;
    includeSummary: boolean;
    maxBulletsPerExperience: number;
    maxProjects: number;
  }
): Promise<{
  contact: ContactInfo;
  summary?: string;
  education: Education[];
  experiences: Array<Experience & { rewrittenBullets: string[] }>;
  projects: Array<Project & { rewrittenBullets: string[] }>;
  skills: SkillCategory[];
}> {
  const systemPrompt = `You are an expert resume writer and ATS optimization specialist. Your task is to create a tailored, ATS-friendly resume.

TASK: Given the candidate's resume and a job description, create an optimized resume that:
1. Highlights the most relevant experiences for the target role
2. Rewrites bullet points using the WHAT → IMPACT → HOW format (action, then metric/result, then method)
3. Incorporates relevant keywords from the job description naturally
4. Is optimized for ATS parsing

BULLET FORMAT (CRITICAL) - Use "What → Impact → How":
- WHAT: Start with the action/deliverable (what you built, launched, led)
- IMPACT: Include the quantified result/metric
- HOW: End with the methods, tools, or approach used
- Example: "Launched AI-powered onboarding flow that reduced merchant setup time by 60% using GPT integration and Square POS API"
- Example: "Built recommendation engine that drove $2M revenue increase through collaborative filtering and A/B testing"
- Example: "Led cross-functional team to ship Smart Upsells feature in 30 days using agile sprints and daily syncs"
- Keep bullets concise (1-2 lines max)

${config.includeSummary ? `SUMMARY:
- Write a 2-3 sentence professional summary
- Mention years of experience, core strengths, and 2-3 JD-aligned skills
- Do NOT use first person` : "NO SUMMARY - skip the summary section"}

CONSTRAINTS:
- Target: ${config.pageCount} page resume
- Max ${config.maxBulletsPerExperience} bullets per experience (choose the most impactful/relevant)
- Max ${config.maxProjects} projects (choose the most relevant to the JD)
- Education: Include ALL education entries exactly as provided

OUTPUT FORMAT (JSON):
{
  "contact": {
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedin": "string",
    "portfolio": "string",
    "github": "string"
  },
  ${config.includeSummary ? '"summary": "string (2-3 sentences)",' : ''}
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "location": "string",
      "graduationDate": "string",
      "concentration": "string (optional)",
      "awards": "string (optional)"
    }
  ],
  "experiences": [
    {
      "title": "string",
      "company": "string",
      "location": "string",
      "startDate": "string",
      "endDate": "string",
      "rewrittenBullets": ["string array - rewritten using WHAT → IMPACT → HOW format"]
    }
  ],
  "projects": [
    {
      "title": "string",
      "techStack": ["string array"],
      "link": "string (optional)",
      "rewrittenBullets": ["string array - rewritten using WHAT → IMPACT → HOW format"]
    }
  ],
  "skills": [
    {
      "category": "string (Languages, Frameworks, Tools, Cloud, Methods, etc.)",
      "skills": ["string array - prioritize JD-relevant skills first"]
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown, no explanations.`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `CANDIDATE'S RESUME:\n${resumeText}\n\n---\n\nJOB DESCRIPTION:\n${jdText}\n\n---\n\nCreate a tailored, ATS-optimized resume for this candidate targeting this job. Rewrite bullets using WHAT → IMPACT → HOW format (action, metric, method). Include ALL education entries.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content);

    return {
      contact: {
        fullName: parsed.contact?.fullName || "Unknown",
        email: parsed.contact?.email || "",
        phone: parsed.contact?.phone,
        location: parsed.contact?.location,
        linkedin: parsed.contact?.linkedin,
        portfolio: parsed.contact?.portfolio,
        github: parsed.contact?.github,
      },
      summary: parsed.summary,
      education: (parsed.education || []).map((edu: any) => ({
        id: generateId(),
        degree: edu.degree || "",
        institution: edu.institution || "",
        location: edu.location,
        graduationDate: edu.graduationDate || "",
        concentration: edu.concentration,
        awards: edu.awards,
        gpa: edu.gpa,
      })),
      experiences: (parsed.experiences || []).map((exp: any) => ({
        id: generateId(),
        title: exp.title || "",
        company: exp.company || "",
        location: exp.location,
        startDate: exp.startDate || "",
        endDate: exp.endDate || "",
        bullets: exp.rewrittenBullets || [],
        rewrittenBullets: exp.rewrittenBullets || [],
      })),
      projects: (parsed.projects || []).map((proj: any) => ({
        id: generateId(),
        title: proj.title || "",
        techStack: proj.techStack || [],
        link: proj.link,
        bullets: proj.rewrittenBullets || [],
        rewrittenBullets: proj.rewrittenBullets || [],
      })),
      skills: (parsed.skills || []).map((cat: any) => ({
        category: cat.category || "Technical Skills",
        skills: cat.skills || [],
      })),
    };
  } catch (error) {
    console.error("AI Resume generation error:", error);
    throw new Error(`Failed to generate tailored resume: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

