// FireResume AI - ATS Compliance Checker
// Comprehensive rules for ensuring resumes pass ATS parsing

import {
  GeneratedResume,
  ATSReport,
  ATSRule,
  ATSViolation,
} from "@/types/fireresume-ai";

// ============================================
// ATS Rule Definitions
// ============================================

export const ATS_RULES: ATSRule[] = [
  // Contact Information Rules
  {
    id: "contact-email",
    name: "Email Required",
    description: "Resume must include a valid email address",
    severity: "error",
  },
  {
    id: "contact-phone",
    name: "Phone Recommended",
    description: "Including a phone number improves ATS compatibility",
    severity: "warning",
  },
  {
    id: "contact-name",
    name: "Full Name Required",
    description: "Resume must include full name at the top",
    severity: "error",
  },

  // Section Rules
  {
    id: "has-experience",
    name: "Work Experience",
    description: "Resume should have work experience section",
    severity: "warning",
  },
  {
    id: "has-skills",
    name: "Skills Section",
    description: "Resume should have skills section for ATS keyword matching",
    severity: "warning",
  },
  {
    id: "has-education",
    name: "Education Section",
    description: "Include education section if relevant",
    severity: "info",
  },

  // Content Quality Rules
  {
    id: "bullet-count",
    name: "Bullet Count",
    description: "Each experience should have 2-4 bullet points",
    severity: "warning",
  },
  {
    id: "bullet-metrics",
    name: "Quantified Achievements",
    description: "Bullet points should include metrics (numbers, percentages)",
    severity: "info",
  },
  {
    id: "bullet-action-verbs",
    name: "Action Verbs",
    description: "Bullets should start with strong action verbs",
    severity: "info",
  },
  {
    id: "summary-optional",
    name: "Summary Section",
    description: "Summary is optional - strong experience sections can stand alone",
    severity: "info",
  },

  // Format Rules
  {
    id: "date-format",
    name: "Standard Date Format",
    description: "Dates should use Month Year format (e.g., May 2023)",
    severity: "warning",
  },
  {
    id: "consistent-dates",
    name: "Consistent Dates",
    description: "All dates should use the same format",
    severity: "info",
  },
  {
    id: "no-special-chars",
    name: "No Special Characters",
    description: "Avoid special characters that may confuse ATS parsers",
    severity: "warning",
  },

  // ATS-Specific Rules
  {
    id: "no-images",
    name: "No Images",
    description: "Resume should not contain images, icons, or graphics",
    severity: "error",
  },
  {
    id: "single-column",
    name: "Single Column Layout",
    description: "Resume uses single column layout for ATS compatibility",
    severity: "error",
  },
  {
    id: "text-based",
    name: "Text-Based Content",
    description: "All content must be actual text, not embedded as graphics",
    severity: "error",
  },
  {
    id: "standard-fonts",
    name: "Standard Fonts",
    description: "Using ATS-safe fonts (Times New Roman, Arial, Helvetica)",
    severity: "info",
  },
  {
    id: "standard-sections",
    name: "Standard Section Headings",
    description:
      "Using standard section names (Experience, Education, Skills)",
    severity: "info",
  },

  // Keyword Rules
  {
    id: "keywords-in-experience",
    name: "Keywords in Experience",
    description: "JD keywords should appear in experience bullets",
    severity: "warning",
  },
  {
    id: "keywords-in-skills",
    name: "Keywords in Skills",
    description: "JD keywords should appear in skills section",
    severity: "warning",
  },
  {
    id: "no-keyword-stuffing",
    name: "No Keyword Stuffing",
    description: "Keywords should appear naturally, not repeated excessively",
    severity: "warning",
  },

  // Link Rules
  {
    id: "links-text-based",
    name: "Text-Based Links",
    description: "URLs should be written in full, not hidden behind hyperlinks",
    severity: "info",
  },
  {
    id: "valid-linkedin",
    name: "Valid LinkedIn URL",
    description: "LinkedIn URL should be in standard format",
    severity: "info",
  },
];

// ============================================
// Validation Functions
// ============================================

/**
 * Check if a string contains special characters that may confuse ATS
 */
function hasProblematicSpecialChars(text: string): boolean {
  // Characters that commonly cause ATS parsing issues
  const problematicChars = /[│║┃┊┋┆┇▪▫►◄•·∙]/;
  return problematicChars.test(text);
}

/**
 * Check if date is in standard format
 */
function isStandardDateFormat(date: string): boolean {
  // Matches: "May 2023", "May, 2023", "2023", "Present", "Current"
  const standardPattern =
    /^(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[,\s]*\d{4}$|^Present$|^Current$|^\d{4}$/i;
  return standardPattern.test(date.trim());
}

/**
 * Check if bullet starts with an action verb
 */
function startsWithActionVerb(bullet: string): boolean {
  const actionVerbs = [
    "achieved",
    "accelerated",
    "accomplished",
    "acquired",
    "administered",
    "advanced",
    "analyzed",
    "applied",
    "architected",
    "assessed",
    "automated",
    "balanced",
    "built",
    "calculated",
    "captured",
    "championed",
    "coached",
    "collaborated",
    "communicated",
    "completed",
    "conducted",
    "configured",
    "consolidated",
    "constructed",
    "consulted",
    "contributed",
    "controlled",
    "converted",
    "coordinated",
    "created",
    "cultivated",
    "customized",
    "decreased",
    "defined",
    "delivered",
    "demonstrated",
    "deployed",
    "designed",
    "developed",
    "devised",
    "diagnosed",
    "directed",
    "discovered",
    "documented",
    "drove",
    "earned",
    "edited",
    "educated",
    "eliminated",
    "enabled",
    "engineered",
    "enhanced",
    "ensured",
    "established",
    "evaluated",
    "exceeded",
    "executed",
    "expanded",
    "expedited",
    "facilitated",
    "finalized",
    "formulated",
    "founded",
    "generated",
    "grew",
    "guided",
    "handled",
    "headed",
    "identified",
    "illustrated",
    "implemented",
    "improved",
    "increased",
    "influenced",
    "initiated",
    "innovated",
    "inspected",
    "installed",
    "instituted",
    "integrated",
    "introduced",
    "invented",
    "investigated",
    "launched",
    "led",
    "leveraged",
    "maintained",
    "managed",
    "maximized",
    "measured",
    "mentored",
    "migrated",
    "minimized",
    "modeled",
    "modernized",
    "modified",
    "monitored",
    "negotiated",
    "operated",
    "optimized",
    "orchestrated",
    "organized",
    "originated",
    "overhauled",
    "oversaw",
    "partnered",
    "performed",
    "piloted",
    "pioneered",
    "planned",
    "positioned",
    "prepared",
    "presented",
    "prioritized",
    "processed",
    "produced",
    "programmed",
    "projected",
    "promoted",
    "proposed",
    "provided",
    "published",
    "purchased",
    "raised",
    "reached",
    "realized",
    "received",
    "recommended",
    "reconciled",
    "recorded",
    "recruited",
    "redesigned",
    "reduced",
    "refined",
    "refactored",
    "reformed",
    "regulated",
    "remodeled",
    "reorganized",
    "repaired",
    "replaced",
    "reported",
    "represented",
    "researched",
    "resolved",
    "restored",
    "restructured",
    "reviewed",
    "revised",
    "revitalized",
    "saved",
    "scheduled",
    "secured",
    "selected",
    "served",
    "shaped",
    "simplified",
    "solved",
    "sourced",
    "spearheaded",
    "specialized",
    "specified",
    "standardized",
    "started",
    "streamlined",
    "strengthened",
    "structured",
    "succeeded",
    "supervised",
    "supported",
    "surpassed",
    "surveyed",
    "sustained",
    "synchronized",
    "systematized",
    "targeted",
    "taught",
    "tested",
    "tracked",
    "trained",
    "transferred",
    "transformed",
    "translated",
    "trimmed",
    "troubleshot",
    "unified",
    "upgraded",
    "utilized",
    "validated",
    "verified",
    "won",
    "wrote",
  ];

  const firstWord = bullet.trim().split(/\s+/)[0]?.toLowerCase() || "";
  return actionVerbs.includes(firstWord);
}

/**
 * Check if bullet has a metric
 */
function hasMetric(text: string): boolean {
  // Matches: numbers, percentages, dollar amounts, multipliers
  const metricPattern = /\d+%|\$[\d,]+|\d+x|\d+\+|\d{1,3}(?:,\d{3})*|\d+/;
  return metricPattern.test(text);
}

/**
 * Check for keyword stuffing
 */
function hasKeywordStuffing(text: string): boolean {
  // Count word frequency
  const words = text.toLowerCase().split(/\s+/);
  const wordCounts: Record<string, number> = {};

  for (const word of words) {
    if (word.length > 3) {
      // Ignore short words
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }

  // Check if any significant word appears more than 5% of the time
  const totalWords = words.length;
  for (const count of Object.values(wordCounts)) {
    if (count > 5 && count / totalWords > 0.05) {
      return true;
    }
  }

  return false;
}

// ============================================
// Main Compliance Check Function
// ============================================

/**
 * Comprehensive ATS compliance check
 */
export function checkATSCompliance(resume: GeneratedResume): ATSReport {
  const violations: ATSViolation[] = [];
  const warnings: ATSViolation[] = [];
  const checkedRules = [...ATS_RULES];

  // Helper to add violation/warning
  const addIssue = (rule: ATSRule, suggestion?: string, location?: string) => {
    const violation: ATSViolation = { rule, suggestion, location };
    if (rule.severity === "error") {
      violations.push(violation);
    } else if (rule.severity === "warning") {
      warnings.push(violation);
    }
  };

  // ==============================
  // Contact Information Checks
  // ==============================

  // Check email
  if (!resume.contact.email) {
    addIssue(
      ATS_RULES.find((r) => r.id === "contact-email")!,
      "Add a professional email address"
    );
  }

  // Check phone
  if (!resume.contact.phone) {
    addIssue(
      ATS_RULES.find((r) => r.id === "contact-phone")!,
      "Consider adding a phone number"
    );
  }

  // Check name
  if (!resume.contact.fullName || resume.contact.fullName.length < 2) {
    addIssue(
      ATS_RULES.find((r) => r.id === "contact-name")!,
      "Include your full name"
    );
  }

  // ==============================
  // Section Checks
  // ==============================

  const includedExperiences = resume.experiences.filter((e) => e.includedInResume);
  const includedProjects = resume.projects.filter((p) => p.includedInResume);

  // Check for experience
  if (includedExperiences.length === 0) {
    addIssue(
      ATS_RULES.find((r) => r.id === "has-experience")!,
      "Add work experience section"
    );
  }

  // Check for skills
  if (resume.skills.length === 0 || resume.skills.flatMap((c) => c.skills).length === 0) {
    addIssue(
      ATS_RULES.find((r) => r.id === "has-skills")!,
      "Add skills section with relevant keywords"
    );
  }

  // ==============================
  // Content Quality Checks
  // ==============================

  // Check bullet counts
  for (const exp of includedExperiences) {
    if (exp.rewrittenBullets.length < 2) {
      addIssue(
        ATS_RULES.find((r) => r.id === "bullet-count")!,
        `Add more bullet points to "${exp.title}" role`,
        `experience.${exp.id}`
      );
    } else if (exp.rewrittenBullets.length > 5) {
      addIssue(
        ATS_RULES.find((r) => r.id === "bullet-count")!,
        `Consider reducing bullets for "${exp.title}" role`,
        `experience.${exp.id}`
      );
    }
  }

  // Check bullets for metrics
  const allBullets = [
    ...includedExperiences.flatMap((e) => e.rewrittenBullets),
    ...includedProjects.flatMap((p) => p.rewrittenBullets),
  ];

  const bulletsWithMetrics = allBullets.filter((b) => hasMetric(b.rewritten));
  const metricRate = bulletsWithMetrics.length / Math.max(allBullets.length, 1);

  if (metricRate < 0.4) {
    addIssue(
      ATS_RULES.find((r) => r.id === "bullet-metrics")!,
      `Only ${Math.round(metricRate * 100)}% of bullets have metrics. Add more quantified achievements.`
    );
  }

  // Check bullets for action verbs
  const bulletsWithActionVerbs = allBullets.filter((b) =>
    startsWithActionVerb(b.rewritten)
  );
  const actionVerbRate =
    bulletsWithActionVerbs.length / Math.max(allBullets.length, 1);

  if (actionVerbRate < 0.8) {
    addIssue(
      ATS_RULES.find((r) => r.id === "bullet-action-verbs")!,
      "Start more bullet points with strong action verbs"
    );
  }

  // ==============================
  // Date Format Checks
  // ==============================

  const allDates = [
    ...includedExperiences.flatMap((e) => [e.startDate, e.endDate]),
    ...resume.education.map((e) => e.graduationDate),
  ].filter(Boolean);

  const invalidDates = allDates.filter((d) => !isStandardDateFormat(d));
  if (invalidDates.length > 0) {
    addIssue(
      ATS_RULES.find((r) => r.id === "date-format")!,
      `Use standard date format (e.g., "May 2023"). Found: ${invalidDates[0]}`
    );
  }

  // ==============================
  // Special Character Checks
  // ==============================

  const resumeText = [
    resume.summary,
    ...allBullets.map((b) => b.rewritten),
    ...resume.skills.flatMap((c) => c.skills),
  ]
    .filter(Boolean)
    .join(" ");

  if (hasProblematicSpecialChars(resumeText)) {
    addIssue(
      ATS_RULES.find((r) => r.id === "no-special-chars")!,
      "Remove special characters that may confuse ATS parsers"
    );
  }

  // ==============================
  // Keyword Stuffing Check
  // ==============================

  if (hasKeywordStuffing(resumeText)) {
    addIssue(
      ATS_RULES.find((r) => r.id === "no-keyword-stuffing")!,
      "Reduce repetition of keywords. Use synonyms or rephrase."
    );
  }

  // ==============================
  // Calculate Score
  // ==============================

  // Base score starts at 100
  let score = 100;

  // Deduct points for issues
  for (const v of violations) {
    if (v.rule.severity === "error") score -= 20;
  }
  for (const w of warnings) {
    if (w.rule.severity === "warning") score -= 5;
  }

  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));

  return {
    passed: violations.filter((v) => v.rule.severity === "error").length === 0,
    score,
    violations,
    warnings,
    checkedRules,
  };
}

/**
 * Quick ATS check for real-time feedback
 */
export function quickATSCheck(resume: Partial<GeneratedResume>): {
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  // Basic checks
  if (!resume.contact?.email) {
    issues.push("Missing email address");
    score -= 20;
  }

  if (!resume.contact?.phone) {
    issues.push("Missing phone number");
    score -= 5;
  }

  const experiences = resume.experiences?.filter((e) => e.includedInResume) || [];
  if (experiences.length === 0) {
    issues.push("No work experience included");
    score -= 15;
  }

  const skills = resume.skills?.flatMap((c) => c.skills) || [];
  if (skills.length === 0) {
    issues.push("No skills listed");
    score -= 10;
  }

  return {
    score: Math.max(0, score),
    issues,
  };
}

