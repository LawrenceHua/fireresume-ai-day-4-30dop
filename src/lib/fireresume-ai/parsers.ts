// FireResume AI - Document Parsers
// Handles parsing of PDF, DOCX, and TXT files to extract resume/JD data

import {
  ResumeData,
  ContactInfo,
  Experience,
  Project,
  Education,
  SkillCategory,
  Certification,
} from "@/types/fireresume-ai";

// ============================================
// Text Extraction Functions
// ============================================

/**
 * Extract text from a PDF file using pdf-parse
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Dynamic import to avoid SSR issues
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);

    if (!data || !data.text) {
      throw new Error("PDF parsing returned empty content");
    }

    return data.text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Extract text from a DOCX file using mammoth
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    // Dynamic import to avoid SSR issues
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.extractRawText({ arrayBuffer });

    if (!result || typeof result.value !== "string") {
      throw new Error("DOCX parsing returned empty content");
    }

    return result.value;
  } catch (error) {
    console.error("Error extracting text from DOCX:", error);
    throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Extract text from a TXT file
 */
export async function extractTextFromTXT(file: File): Promise<string> {
  try {
    const text = await file.text();
    if (typeof text !== "string") {
      throw new Error("TXT file reading returned invalid content");
    }
    return text;
  } catch (error) {
    console.error("Error extracting text from TXT:", error);
    throw new Error(`Failed to extract text from TXT: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Extract text from any supported file type
 */
export async function extractText(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type;

  if (fileName.endsWith(".pdf") || mimeType === "application/pdf") {
    return await extractTextFromPDF(file);
  } else if (
    fileName.endsWith(".docx") ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return await extractTextFromDOCX(file);
  } else if (
    fileName.endsWith(".doc") ||
    mimeType === "application/msword"
  ) {
    // For .doc files, try mammoth (it may work) or return error
    try {
      return await extractTextFromDOCX(file);
    } catch {
      throw new Error(
        "Old .doc format not fully supported. Please convert to .docx or .pdf"
      );
    }
  } else if (
    fileName.endsWith(".txt") ||
    mimeType === "text/plain" ||
    mimeType === ""
  ) {
    return await extractTextFromTXT(file);
  } else {
    throw new Error(`Unsupported file type: ${mimeType || fileName}`);
  }
}

// ============================================
// Section Detection Patterns
// ============================================

const SECTION_PATTERNS = {
  contact: /^(contact|personal\s*info|information)/i,
  summary: /^(summary|profile|objective|about|professional\s*summary)/i,
  experience:
    /^(experience|work\s*experience|employment|professional\s*experience|work\s*history)/i,
  projects: /^(projects|personal\s*projects|side\s*projects|portfolio)/i,
  education: /^(education|academic|qualifications|degrees)/i,
  skills:
    /^(skills|technical\s*skills|competencies|technologies|expertise|proficiencies)/i,
  certifications:
    /^(certifications|certificates|licenses|credentials|professional\s*development)/i,
  publications: /^(publications|papers|research|articles)/i,
  awards: /^(awards|honors|achievements|recognition)/i,
  volunteer:
    /^(volunteer|volunteering|community|service|extracurricular)/i,
};

// ============================================
// Resume Parsing
// ============================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Extract contact information from text
 */
export function extractContactInfo(text: string): ContactInfo {
  // Null safety check
  if (!text || typeof text !== "string") {
    return {
      fullName: "Unknown",
      email: "",
    };
  }
  
  const lines = text.split("\n").filter((line) => line.trim());

  // The name is usually the first non-empty line
  const fullName = lines[0]?.trim() || "Unknown";

  // Email pattern
  const emailMatch = text.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  );
  const email = emailMatch ? emailMatch[0] : "";

  // Phone pattern (various formats)
  const phoneMatch = text.match(
    /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/
  );
  const phone = phoneMatch ? phoneMatch[0] : undefined;

  // LinkedIn pattern
  const linkedinMatch = text.match(
    /(?:linkedin\.com\/in\/|linkedin:?\s*)([a-zA-Z0-9-]+)/i
  );
  const linkedin = linkedinMatch
    ? `https://linkedin.com/in/${linkedinMatch[1]}`
    : undefined;

  // GitHub pattern
  const githubMatch = text.match(
    /(?:github\.com\/|github:?\s*)([a-zA-Z0-9-]+)/i
  );
  const github = githubMatch
    ? `https://github.com/${githubMatch[1]}`
    : undefined;

  // Portfolio/website pattern
  const portfolioMatch = text.match(
    /(?:portfolio|website|site):?\s*(https?:\/\/[^\s]+)/i
  );
  const portfolio = portfolioMatch ? portfolioMatch[1] : undefined;

  // Location pattern (City, State or City, ST)
  const locationMatch = text.match(
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*([A-Z]{2}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/
  );
  const location = locationMatch
    ? `${locationMatch[1]}, ${locationMatch[2]}`
    : undefined;

  return {
    fullName,
    email,
    phone,
    location,
    linkedin,
    github,
    portfolio,
  };
}

/**
 * Extract experiences from text - robust parser for various resume formats
 */
export function extractExperiences(text: string): Experience[] {
  const experiences: Experience[] = [];

  // Null safety check
  if (!text || typeof text !== "string") {
    return experiences;
  }

  // Date pattern: Month Year - Month Year or Month Year - Present (flexible)
  const datePattern =
    /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[.,]?\s*\d{4}\s*(?:-|–|—|to|~)\s*(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[.,]?\s*\d{4}|Present|Current|Now)/gi;

  // Multiple splitting strategies for robustness
  // Strategy 1: Split by common experience delimiters
  // Look for patterns like "Company Name | Title" or "Title at Company" or "Title, Company"
  const experienceBlocks = text.split(
    /\n(?=[A-Z][a-zA-Z\s]+(?:,|\||–|—|-|at)\s*[A-Z])/
  );

  // Strategy 2: Look for role/title keywords
  const roleTitleKeywords = /(?:Engineer|Developer|Manager|Designer|Analyst|Scientist|Lead|Director|Intern|Associate|Specialist|Coordinator|Consultant|Architect|Product|Growth)/i;

  for (const block of experienceBlocks) {
    if (block.trim().length < 20) continue;

    const lines = block.split("\n").filter((line) => line.trim());
    if (lines.length === 0) continue;

    // First line usually contains title and company
    const headerLine = lines[0];
    const blockDateMatches = block.match(datePattern);

    // Try to parse title and company with multiple patterns
    let title = "";
    let company = "";
    let location: string | undefined;

    // Pattern 1: "Title | Company" or "Title – Company"
    let titleCompanyMatch = headerLine.match(
      /^(.+?)\s*(?:\||–|—)\s*(.+?)$/
    );

    // Pattern 2: "Title at Company" or "Title, Company"
    if (!titleCompanyMatch) {
      titleCompanyMatch = headerLine.match(
        /^(.+?)\s*(?:at|,)\s*(.+?)$/
      );
    }

    // Pattern 3: Just detect if line contains role keywords
    if (!titleCompanyMatch && roleTitleKeywords.test(headerLine)) {
      // Try to extract company from next line
      title = headerLine.trim();
      const nextLine = lines[1]?.trim() || "";
      if (nextLine && !nextLine.match(/^[•\-\*\d\)]/)) {
        company = nextLine;
      }
    }

    if (titleCompanyMatch) {
      title = titleCompanyMatch[1].trim();
      company = titleCompanyMatch[2].trim();
      
      // Check if company contains location (e.g., "Google, Mountain View, CA")
      const companyLocationMatch = company.match(
        /^(.+?),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s*[A-Z]{2})?$/
      );
      if (companyLocationMatch) {
        company = companyLocationMatch[1].trim();
        location = companyLocationMatch[2]?.trim();
      }
    } else if (!title) {
      title = headerLine.trim();
      company = lines[1]?.trim() || "";
    }

    // Extract bullets (lines starting with •, -, *, ▪, ◦, or numbers)
    // Be more aggressive in finding bullets - they're the most important part
    const bullets: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip date lines
      if (datePattern.test(line)) continue;
      
      // Match various bullet formats
      const bulletMatch = line.match(/^[\s]*[•\-\*▪◦●○►◆\d\)\.]+\s*(.+)/);
      if (bulletMatch) {
        const bulletText = bulletMatch[1].trim();
        // Only add substantial bullets (Impact-How bullets tend to be longer)
        if (bulletText.length > 20) {
          bullets.push(bulletText);
        }
      } else if (line.trim().length > 40) {
        // Long lines without markers might be bullets in some formats
        // Check if it looks like an achievement (starts with verb or contains metrics)
        const looksLikeAchievement = /^(?:[A-Z][a-z]+ed|[A-Z][a-z]+ing|Led|Built|Created|Developed|Drove|Increased|Reduced|Launched|Managed|Designed|Implemented|\d+%|\$\d)/i.test(line.trim());
        if (looksLikeAchievement) {
          bullets.push(line.trim());
        }
      }
    }

    // Only add if we have meaningful content
    if ((title || company) && (bullets.length > 0 || blockDateMatches)) {
      experiences.push({
        id: generateId(),
        title: title || "Role",
        company: company || "Company",
        location,
        startDate: blockDateMatches ? extractStartDate(blockDateMatches[0]) : "",
        endDate: blockDateMatches ? extractEndDate(blockDateMatches[0]) : "",
        bullets: bullets.slice(0, 8), // Allow up to 8 bullets for robust parsing
      });
    }
  }

  // Deduplicate experiences by title+company
  const seen = new Set<string>();
  return experiences.filter((exp) => {
    const key = `${exp.title.toLowerCase()}-${exp.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extract start date from a date range string
 */
function extractStartDate(dateRange: string): string {
  const parts = dateRange.split(/\s*(?:-|–|—|to)\s*/i);
  return parts[0]?.trim() || "";
}

/**
 * Extract end date from a date range string
 */
function extractEndDate(dateRange: string): string {
  const parts = dateRange.split(/\s*(?:-|–|—|to)\s*/i);
  return parts[1]?.trim() || "Present";
}

/**
 * Extract projects from text - robust parser with strong link detection
 */
export function extractProjects(text: string): Project[] {
  const projects: Project[] = [];

  // Null safety check
  if (!text || typeof text !== "string") {
    return projects;
  }

  // URL patterns for project links (GitHub, deployed apps, etc.)
  const urlPatterns = {
    github: /https?:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-_.]+/g,
    generic: /https?:\/\/[^\s\)\]]+/g,
  };

  // Look for project patterns - more flexible splitting
  // Projects often appear after "Projects" heading or with tech stacks in parentheses
  const projectBlocks = text.split(
    /\n(?=[A-Z][a-zA-Z0-9\s-]+(?:\s*[\|\(]|\s*-\s*(?:Built|Developed|Created)))/
  );

  // Also try to find projects by looking for GitHub links
  const githubLinks = text.match(urlPatterns.github) || [];

  for (const block of projectBlocks) {
    if (block.trim().length < 15) continue;

    const lines = block.split("\n").filter((line) => line.trim());
    if (lines.length === 0) continue;

    const headerLine = lines[0];

    // Extract title - multiple patterns
    let title = "";
    
    // Pattern 1: "Project Name | Tech Stack" or "Project Name (Tech Stack)"
    const titleMatch = headerLine.match(/^([^|\(\[]+)/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // Clean up title - remove trailing dashes, colons
    title = title.replace(/[\-:]+$/, "").trim();

    // Skip if title looks like a section header
    if (/^(?:projects?|experience|education|skills?)$/i.test(title)) {
      continue;
    }

    // Extract tech stack from parentheses, brackets, or after |
    const techStack: string[] = [];
    
    // Pattern: (React, Node.js, MongoDB)
    const parenMatch = headerLine.match(/\(([^)]+)\)/);
    if (parenMatch) {
      techStack.push(
        ...parenMatch[1].split(/[,\/|]/).map((t) => t.trim()).filter(Boolean)
      );
    }
    
    // Pattern: [React, Node.js]
    const bracketMatch = headerLine.match(/\[([^\]]+)\]/);
    if (bracketMatch) {
      techStack.push(
        ...bracketMatch[1].split(/[,\/|]/).map((t) => t.trim()).filter(Boolean)
      );
    }

    // Pattern: | React, Node.js
    const pipeMatch = headerLine.match(/\|\s*([^|\n]+)$/);
    if (pipeMatch && techStack.length === 0) {
      techStack.push(
        ...pipeMatch[1].split(/[,\/]/).map((t) => t.trim()).filter(Boolean)
      );
    }

    // Extract all links from the block
    const allLinks: string[] = [];
    const githubMatches = block.match(urlPatterns.github);
    const genericMatches = block.match(urlPatterns.generic);
    
    if (githubMatches) allLinks.push(...githubMatches);
    if (genericMatches) {
      // Filter out non-project URLs (like linkedin, mailto, etc.)
      const projectUrls = genericMatches.filter(
        (url) =>
          !url.includes("linkedin.com") &&
          !url.includes("mailto:") &&
          !url.includes("twitter.com") &&
          !url.includes("facebook.com")
      );
      allLinks.push(...projectUrls);
    }

    // Prefer GitHub links, then others
    const link = allLinks.find((l) => l.includes("github.com")) || allLinks[0];

    // Extract bullets (Impact-How format)
    const bullets: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Match various bullet formats
      const bulletMatch = line.match(/^[\s]*[•\-\*▪◦●○►◆\d\)\.]+\s*(.+)/);
      if (bulletMatch) {
        const bulletText = bulletMatch[1].trim();
        if (bulletText.length > 15) {
          bullets.push(bulletText);
        }
      } else if (line.trim().length > 30) {
        // Check for achievement-like content
        const looksLikeAchievement = /^(?:[A-Z][a-z]+ed|Built|Created|Developed|Integrated|Implemented|\d+%|\$\d)/i.test(line.trim());
        if (looksLikeAchievement) {
          bullets.push(line.trim());
        }
      }
    }

    // Only add substantial projects
    if (title && title.length > 2 && title.length < 100) {
      projects.push({
        id: generateId(),
        title,
        techStack: [...new Set(techStack)], // Deduplicate
        link,
        bullets: bullets.slice(0, 4),
      });
    }
  }

  // Deduplicate projects by title
  const seen = new Set<string>();
  return projects.filter((proj) => {
    const key = proj.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extract project links from text
 */
export function extractProjectLinks(text: string): string[] {
  const links: string[] = [];

  // GitHub repo links
  const githubMatches = text.match(
    /https?:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-_.]+/g
  );
  if (githubMatches) links.push(...githubMatches);

  // Generic project links (demo, live, etc.)
  const demoMatches = text.match(
    /(?:demo|live|deployed|website|app):?\s*(https?:\/\/[^\s]+)/gi
  );
  if (demoMatches) {
    for (const match of demoMatches) {
      const urlMatch = match.match(/https?:\/\/[^\s]+/);
      if (urlMatch) links.push(urlMatch[0]);
    }
  }

  return [...new Set(links)]; // Remove duplicates
}

/**
 * Extract education from text
 */
export function extractEducation(text: string): Education[] {
  const education: Education[] = [];

  // Null safety check
  if (!text || typeof text !== "string") {
    return education;
  }

  // Common degree patterns
  const degreePattern =
    /(?:Bachelor|Master|Ph\.?D\.?|B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?|MBA|Associate)/gi;

  // Split by degree mentions
  const eduBlocks = text.split(
    /\n(?=(?:Bachelor|Master|Ph\.?D\.?|B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?|MBA|Associate))/i
  );

  for (const block of eduBlocks) {
    if (block.trim().length < 10) continue;

    const lines = block.split("\n").filter((line) => line.trim());
    if (lines.length === 0) continue;

    // Extract degree
    const degreeMatch = block.match(degreePattern);
    let degree = degreeMatch ? degreeMatch[0] : "";

    // Try to get full degree name (e.g., "Bachelor of Science in Computer Science")
    const fullDegreeMatch = block.match(
      /(?:Bachelor|Master|Ph\.?D\.?|B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?|MBA|Associate)(?:'?s)?(?:\s+of\s+[A-Za-z]+)?(?:\s+in\s+[A-Za-z\s]+)?/i
    );
    if (fullDegreeMatch) {
      degree = fullDegreeMatch[0].trim();
    }

    // Extract institution
    const institutionPatterns = [
      /(?:University|College|Institute|School)\s+of\s+[A-Za-z\s]+/i,
      /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:University|College|Institute)/i,
    ];

    let institution = "";
    for (const pattern of institutionPatterns) {
      const match = block.match(pattern);
      if (match) {
        institution = match[0].trim();
        break;
      }
    }

    // Extract graduation date
    const gradMatch = block.match(
      /(?:May|June|August|December|Spring|Fall|Summer|Winter)\s*\d{4}|\d{4}/i
    );
    const graduationDate = gradMatch ? gradMatch[0] : "";

    // Extract GPA
    const gpaMatch = block.match(/(?:GPA|Grade):?\s*(\d+\.?\d*)\s*(?:\/\s*\d+\.?\d*)?/i);
    const gpa = gpaMatch ? gpaMatch[1] : undefined;

    if (degree || institution) {
      education.push({
        id: generateId(),
        degree,
        institution: institution || lines[0].replace(degree, "").trim(),
        graduationDate,
        gpa,
      });
    }
  }

  return education;
}

/**
 * Extract skills from text - robust parser handling various formats
 */
export function extractSkills(text: string): SkillCategory[] {
  const skillCategories: SkillCategory[] = [];

  // Null safety check
  if (!text || typeof text !== "string") {
    return skillCategories;
  }

  // Common skill category patterns - expanded and more flexible
  const categoryPatterns: Record<string, RegExp[]> = {
    Languages: [
      /(?:programming\s*)?languages?:?\s*([^\n]+)/i,
      /^languages?:?\s*(.+)$/im,
    ],
    Frameworks: [
      /frameworks?(?:\s*(?:&|and)\s*libraries)?:?\s*([^\n]+)/i,
      /libraries?(?:\s*(?:&|and)\s*frameworks?)?:?\s*([^\n]+)/i,
    ],
    Tools: [
      /(?:dev(?:eloper)?\s*)?tools?:?\s*([^\n]+)/i,
      /(?:build\s*)?tools?:?\s*([^\n]+)/i,
    ],
    Databases: [
      /databases?:?\s*([^\n]+)/i,
      /data(?:\s*stores?)?:?\s*([^\n]+)/i,
    ],
    Cloud: [
      /cloud(?:\s*(?:services?|platforms?))?:?\s*([^\n]+)/i,
      /(?:aws|gcp|azure):?\s*([^\n]+)/i,
    ],
    "DevOps & Infrastructure": [
      /devops:?\s*([^\n]+)/i,
      /infrastructure:?\s*([^\n]+)/i,
      /ci\/cd:?\s*([^\n]+)/i,
    ],
    Methods: [
      /(?:methodologies?|practices?|processes?):?\s*([^\n]+)/i,
      /(?:agile|scrum|kanban):?\s*([^\n]+)/i,
    ],
    "Product & Design": [
      /(?:product\s*)?(?:management|design):?\s*([^\n]+)/i,
      /ux(?:\/ui)?:?\s*([^\n]+)/i,
    ],
    "Data & Analytics": [
      /(?:data\s*)?(?:analytics?|science):?\s*([^\n]+)/i,
      /(?:ml(?:\/ai)?|machine\s*learning):?\s*([^\n]+)/i,
    ],
  };

  // Try each category pattern
  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const rawSkills = match[1];
        const skills = rawSkills
          .split(/[,|•;]/)
          .map((s) => s.trim())
          .filter((s) => {
            // Filter valid skills
            return (
              s.length > 0 &&
              s.length < 50 &&
              !/^(?:and|or|etc|more)$/i.test(s) &&
              !/^\d+$/.test(s) // Not just a number
            );
          });
        
        if (skills.length > 0) {
          // Check if we already have this category
          const existing = skillCategories.find(
            (c) => c.category.toLowerCase() === category.toLowerCase()
          );
          if (existing) {
            // Merge skills, avoiding duplicates
            const newSkills = skills.filter(
              (s) => !existing.skills.some((es) => es.toLowerCase() === s.toLowerCase())
            );
            existing.skills.push(...newSkills);
          } else {
            skillCategories.push({ category, skills });
          }
        }
        break; // Found a match for this category, move to next
      }
    }
  }

  // If no categories found, try to extract a general skills section
  if (skillCategories.length === 0) {
    // Look for skills section by header
    const skillsSectionMatch = text.match(
      /(?:^|\n)(?:technical\s*)?skills?(?:\s*(?:&|and)\s*(?:tools?|technologies?))?[:\s]*\n?([\s\S]*?)(?=\n(?:experience|education|projects?|certifications?|$))/i
    );
    
    if (skillsSectionMatch && skillsSectionMatch[1]) {
      const skillsText = skillsSectionMatch[1];
      
      // Try to detect categories within the section
      const lines = skillsText.split("\n").filter((l) => l.trim());
      let currentCategory = "Technical Skills";
      
      for (const line of lines) {
        // Check if line is a category header
        const categoryHeaderMatch = line.match(/^([A-Za-z\s&]+):(.+)$/);
        if (categoryHeaderMatch && categoryHeaderMatch[1] && categoryHeaderMatch[2]) {
          currentCategory = categoryHeaderMatch[1].trim();
          const skills = categoryHeaderMatch[2]
            .split(/[,|•;]/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && s.length < 50);
          
          if (skills.length > 0) {
            skillCategories.push({ category: currentCategory, skills });
          }
        } else {
          // Line is a list of skills
          const skills = line
            .split(/[,|•;]/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && s.length < 50);
          
          if (skills.length > 0) {
            const existing = skillCategories.find((c) => c.category === currentCategory);
            if (existing) {
              existing.skills.push(...skills);
            } else {
              skillCategories.push({ category: currentCategory, skills });
            }
          }
        }
      }
    }
  }

  // Final fallback: look for common tech terms
  if (skillCategories.length === 0) {
    const techTerms = text.match(
      /\b(Python|JavaScript|TypeScript|Java|C\+\+|Go|Rust|Ruby|PHP|Swift|Kotlin|React|Angular|Vue|Node\.js|Django|Flask|Spring|AWS|Azure|GCP|Docker|Kubernetes|SQL|NoSQL|MongoDB|PostgreSQL|Redis|GraphQL|REST|API|CI\/CD|Agile|Scrum|Git|Linux|Terraform|Figma|Jira)\b/gi
    );
    
    if (techTerms && techTerms.length > 0) {
      const uniqueSkills = [...new Set(techTerms.map((t) => t))];
      skillCategories.push({ category: "Technical Skills", skills: uniqueSkills });
    }
  }

  // Deduplicate skills within each category
  return skillCategories.map((cat) => ({
    ...cat,
    skills: [...new Set(cat.skills)],
  }));
}

/**
 * Extract certifications from text
 */
export function extractCertifications(text: string): Certification[] {
  const certifications: Certification[] = [];

  // Null safety check
  if (!text || typeof text !== "string") {
    return certifications;
  }

  // Common certification patterns
  const certPatterns = [
    /(?:AWS|Google|Azure|PMP|Scrum|CISSP|CPA|CFA)\s+[A-Za-z\s]+(?:Certified|Certificate|Professional)?/gi,
    /Certified\s+[A-Za-z\s]+/gi,
  ];

  for (const pattern of certPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Avoid duplicates
        if (!certifications.some((c) => c.name === match.trim())) {
          certifications.push({
            id: generateId(),
            name: match.trim(),
            issuer: "", // Would need more context to extract
          });
        }
      }
    }
  }

  return certifications;
}

/**
 * Detect and split text into sections
 */
export function extractSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  
  // Null safety check
  if (!text || typeof text !== "string") {
    return sections;
  }
  
  const lines = text.split("\n");

  let currentSection = "header";
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check if this line is a section header
    let foundSection = false;
    for (const [sectionName, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(trimmedLine) && trimmedLine.length < 50) {
        // Save previous section
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join("\n");
        }
        currentSection = sectionName;
        currentContent = [];
        foundSection = true;
        break;
      }
    }

    if (!foundSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentContent.length > 0) {
    sections[currentSection] = currentContent.join("\n");
  }

  return sections;
}

// ============================================
// Main Parse Functions
// ============================================

/**
 * Parse a resume file into structured ResumeData
 */
export async function parseResume(file: File): Promise<ResumeData> {
  // Extract text with validation
  const text = await extractText(file);
  
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Could not extract any text from the resume file. Please ensure the file is not empty or corrupted.");
  }

  console.log(`[parseResume] Extracted ${text.length} characters from ${file.name}`);
  
  const sections = extractSections(text);

  // Extract from the full text if sections aren't clearly delineated
  const fullText = Object.values(sections).join("\n") || text;

  const contact = extractContactInfo(sections.header || fullText.slice(0, 500));
  const experiences = extractExperiences(sections.experience || fullText);
  const projects = extractProjects(sections.projects || fullText);
  const education = extractEducation(sections.education || fullText);
  const skills = extractSkills(sections.skills || fullText);
  const certifications = extractCertifications(
    sections.certifications || fullText
  );

  // Extract summary if present
  let summary: string | undefined;
  if (sections.summary) {
    summary = sections.summary.trim().slice(0, 500);
  }

  console.log(`[parseResume] Found ${experiences.length} experiences, ${projects.length} projects, ${skills.length} skill categories`);

  return {
    contact,
    summary,
    experiences,
    projects,
    education,
    skills,
    certifications: certifications.length > 0 ? certifications : undefined,
    rawText: text,
  };
}

/**
 * Parse a job description file into text
 */
export async function parseJD(file: File): Promise<string> {
  return await extractText(file);
}

/**
 * Parse text directly (for pasted JD text)
 */
export function parseJDText(text: string): string {
  // Clean up the text
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

