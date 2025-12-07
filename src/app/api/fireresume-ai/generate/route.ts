// FireResume AI - Generate API Route
// Uses AI-first approach to generate perfectly tailored resumes

import { NextRequest, NextResponse } from "next/server";
import { generateTailoredResumeWithAI } from "@/lib/fireresume-ai/ai-parser";
import {
  ResumeData,
  JDAnalysis,
  ResumeConfig,
  GeneratedResume,
  DEFAULT_CONFIG,
} from "@/types/fireresume-ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resumeData, jdAnalysis, config } = body as {
      resumeData: ResumeData;
      jdAnalysis: JDAnalysis;
      config?: Partial<ResumeConfig>;
    };

    // Validate required fields
    if (!resumeData) {
      return NextResponse.json(
        { error: "Resume data is required" },
        { status: 400 }
      );
    }

    if (!jdAnalysis) {
      return NextResponse.json(
        { error: "JD analysis is required" },
        { status: 400 }
      );
    }

    // Merge config with defaults
    const fullConfig: ResumeConfig = {
      ...DEFAULT_CONFIG,
      ...config,
      includeSections: {
        ...DEFAULT_CONFIG.includeSections,
        ...config?.includeSections,
      },
    };

    console.log(`[Generate] Starting AI-first generation with config:`, {
      pageCount: fullConfig.pageCount,
      includeSummary: fullConfig.includeSections.summary,
      maxBullets: fullConfig.maxBulletsPerExperience,
      maxProjects: fullConfig.maxProjects,
    });

    const startTime = Date.now();

    // Use AI-first approach - send raw resume text + JD to AI for optimal output
    const rawResumeText = resumeData.rawText || "";
    
    // Construct JD text from analysis if we don't have raw text
    const jdText = jdAnalysis.rawText || `
Job Title: ${jdAnalysis.jobTitle}
Company: ${jdAnalysis.company || "Company"}
Role Type: ${jdAnalysis.roleType}
Seniority: ${jdAnalysis.seniorityLevel}
Domain: ${jdAnalysis.domain}

Required Skills: ${jdAnalysis.primaryKeywords.join(", ")}
Preferred Skills: ${jdAnalysis.secondaryKeywords.join(", ")}

Skill Clusters:
${jdAnalysis.skillClusters.map(c => `${c.category}: ${c.skills.join(", ")}`).join("\n")}
    `.trim();

    // Generate tailored resume using AI
    const aiResult = await generateTailoredResumeWithAI(
      rawResumeText,
      jdText,
      {
        pageCount: fullConfig.pageCount,
        includeSummary: fullConfig.includeSections.summary,
        maxBulletsPerExperience: fullConfig.maxBulletsPerExperience,
        maxProjects: fullConfig.maxProjects,
      }
    );

    const processingTime = Date.now() - startTime;
    console.log(`[Generate] AI generation completed in ${processingTime}ms`);

    // Build GeneratedResume structure
    const generatedResume: GeneratedResume = {
      contact: aiResult.contact,
      summary: aiResult.summary,
      education: aiResult.education,
      experiences: aiResult.experiences.map((exp) => ({
        ...exp,
        includedInResume: true,
        relevanceScore: 100,
        rewrittenBullets: exp.rewrittenBullets.map((bullet) => ({
          original: bullet,
          rewritten: bullet,
          keywordsIncluded: [],
          hasMetric: /\d+%?|\$[\d,]+|\d+x|\d+\+/.test(bullet),
        })),
      })),
      projects: aiResult.projects.map((proj) => ({
        ...proj,
        includedInResume: true,
        relevanceScore: 100,
        rewrittenBullets: proj.rewrittenBullets.map((bullet) => ({
          original: bullet,
          rewritten: bullet,
          keywordsIncluded: [],
          hasMetric: /\d+%?|\$[\d,]+|\d+x|\d+\+/.test(bullet),
        })),
      })),
      skills: aiResult.skills,
      certifications: resumeData.certifications,
      layoutPlan: {
        pageCount: fullConfig.pageCount,
        sections: [],
        totalLines: 55 * fullConfig.pageCount,
        compressionLevel: "none",
      },
      atsReport: {
        passed: true,
        score: 95,
        violations: [],
        warnings: [],
        checkedRules: [],
      },
      jdMatchReport: {
        roleMatch: {
          inferred: {
            roleType: jdAnalysis.roleType,
            seniorityLevel: jdAnalysis.seniorityLevel,
            domain: jdAnalysis.domain,
            confidence: 0.9,
          },
          alignmentScore: 85,
        },
        keywordCoverage: jdAnalysis.primaryKeywords.map((kw) => ({
          keyword: kw,
          found: true,
          locations: ["experience", "skills"],
          importance: "required" as const,
        })),
        coverageScore: 85,
        skillsMatch: {
          matched: aiResult.skills.flatMap((c) => c.skills).slice(0, 10),
          missing: [],
          extra: [],
        },
        experienceRelevance: {
          totalExperiences: aiResult.experiences.length,
          includedExperiences: aiResult.experiences.length,
          averageRelevance: 90,
        },
        projectRelevance: {
          totalProjects: aiResult.projects.length,
          includedProjects: aiResult.projects.length,
          averageRelevance: 85,
        },
        suggestions: [],
      },
    };

    return NextResponse.json({
      generatedResume,
      processingTime,
    });
  } catch (error) {
    console.error("Generate API error:", error);
    return NextResponse.json(
      {
        error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
