// FireResume AI - Main exports
// Re-exports all modules for easy importing

// Parsers (legacy regex-based)
export {
  extractText,
  extractTextFromPDF,
  extractTextFromDOCX,
  extractTextFromTXT,
  extractContactInfo,
  extractExperiences,
  extractProjects,
  extractProjectLinks,
  extractEducation,
  extractSkills,
  extractCertifications,
  extractSections,
  parseResume,
  parseJD,
  parseJDText,
} from "./parsers";

// AI Parser (recommended - more accurate)
export {
  parseResumeWithAI,
  generateTailoredResumeWithAI,
} from "./ai-parser";

// JD Intelligence
export {
  analyzeJD,
  classifyRole,
  inferLevel,
  extractAllKeywords,
} from "./jd-intelligence";

// Generator
export {
  mapJDToProfile,
  rankExperiences,
  rankProjects,
  selectTopProjects,
  rewriteBullets,
  rewriteProjectBullets,
  generateSummary,
  allocateLayout,
  checkATSCompliance,
  generateJDMatchReport,
  generateResume,
} from "./generator";

// Renderers
export {
  renderLaTeX,
  renderDOCX,
  renderPDF,
  renderPlainText,
  exportResume,
} from "./renderers";

// ATS Compliance
export {
  ATS_RULES,
  checkATSCompliance as comprehensiveATSCheck,
  quickATSCheck,
} from "./ats-compliance";

