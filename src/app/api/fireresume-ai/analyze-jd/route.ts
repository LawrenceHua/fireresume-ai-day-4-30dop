// FireResume AI - JD Analysis API Route
// Analyzes a job description and returns structured analysis

import { NextRequest, NextResponse } from "next/server";
import { analyzeJD, classifyRole, inferLevel } from "@/lib/fireresume-ai/jd-intelligence";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jdText, quickClassify } = body as {
      jdText: string;
      quickClassify?: boolean;
    };

    if (!jdText) {
      return NextResponse.json(
        { error: "Job description text is required" },
        { status: 400 }
      );
    }

    // Quick classify mode - just return role classification
    if (quickClassify) {
      const classification = await classifyRole(jdText);
      const level = await inferLevel(jdText);

      return NextResponse.json({
        classification,
        level,
      });
    }

    // Full analysis
    const analysis = await analyzeJD(jdText);

    return NextResponse.json({
      analysis,
    });
  } catch (error) {
    console.error("JD Analysis API error:", error);
    return NextResponse.json(
      {
        error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}

