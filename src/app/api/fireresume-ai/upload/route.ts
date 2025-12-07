// FireResume AI - Upload API Route
// Handles resume and JD file uploads, uses AI for accurate parsing

import { NextRequest, NextResponse } from "next/server";
import { extractText } from "@/lib/fireresume-ai/parsers";
import { parseResumeWithAI } from "@/lib/fireresume-ai/ai-parser";
import { analyzeJD } from "@/lib/fireresume-ai/jd-intelligence";
import { UploadResponse } from "@/types/fireresume-ai";

// 5MB max file size
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const resumeFile = formData.get("resume") as File | null;
    const jdFile = formData.get("jdFile") as File | null;
    const jdText = formData.get("jdText") as string | null;

    const response: UploadResponse = {
      resumeData: null,
      jdAnalysis: null,
      errors: [],
    };

    // Parse resume if provided - use AI for accuracy
    if (resumeFile) {
      // Check file size
      if (resumeFile.size > MAX_FILE_SIZE) {
        response.errors?.push(
          `Resume file too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
        );
      } else {
        try {
          console.log(`[Upload] Processing resume: ${resumeFile.name}`);
          
          // Extract text from file
          const resumeText = await extractText(resumeFile);
          
          if (!resumeText || resumeText.trim().length < 100) {
            throw new Error("Could not extract enough text from the resume file");
          }
          
          console.log(`[Upload] Extracted ${resumeText.length} characters, sending to AI parser...`);
          
          // Use AI to parse the resume - much more accurate
          response.resumeData = await parseResumeWithAI(resumeText);
          
          console.log(`[Upload] AI parsed: ${response.resumeData.experiences.length} experiences, ${response.resumeData.education.length} education`);
        } catch (error) {
          console.error("Error parsing resume:", error);
          response.errors?.push(
            `Failed to parse resume: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
    }

    // Parse and analyze JD
    let jdContent: string | null = null;

    if (jdFile) {
      // Check file size
      if (jdFile.size > MAX_FILE_SIZE) {
        response.errors?.push(
          `JD file too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
        );
      } else {
        try {
          jdContent = await extractText(jdFile);
        } catch (error) {
          console.error("Error parsing JD file:", error);
          response.errors?.push(
            `Failed to parse JD file: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
    } else if (jdText) {
      jdContent = jdText.trim();
    }

    // Analyze JD if we have content
    if (jdContent && jdContent.length > 50) {
      try {
        console.log(`[Upload] Analyzing JD (${jdContent.length} chars)...`);
        response.jdAnalysis = await analyzeJD(jdContent);
        console.log(`[Upload] JD analyzed: ${response.jdAnalysis.roleType}, ${response.jdAnalysis.seniorityLevel}`);
      } catch (error) {
        console.error("Error analyzing JD:", error);
        response.errors?.push(
          `Failed to analyze JD: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    } else if (jdContent) {
      response.errors?.push("Job description is too short. Please provide more details.");
    }

    // Return response
    return NextResponse.json(response);
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      {
        resumeData: null,
        jdAnalysis: null,
        errors: [
          `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      },
      { status: 500 }
    );
  }
}
