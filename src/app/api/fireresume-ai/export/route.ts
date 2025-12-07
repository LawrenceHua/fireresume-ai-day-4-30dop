// FireResume AI - Export API Route
// Exports the generated resume to PDF, DOCX, or LaTeX format

import { NextRequest, NextResponse } from "next/server";
import { exportResume, SectionType, DEFAULT_SECTION_ORDER } from "@/lib/fireresume-ai/renderers";
import { GeneratedResume, ExportFormat } from "@/types/fireresume-ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { generatedResume, format, fileName, sectionOrder } = body as {
      generatedResume: GeneratedResume;
      format: ExportFormat;
      fileName?: string;
      sectionOrder?: SectionType[];
    };

    // Validate required fields
    if (!generatedResume) {
      return NextResponse.json(
        { error: "Generated resume data is required" },
        { status: 400 }
      );
    }

    if (!format || !["pdf", "docx", "latex", "txt"].includes(format)) {
      return NextResponse.json(
        { error: "Valid format (pdf, docx, latex, txt) is required" },
        { status: 400 }
      );
    }

    // Export the resume with section order
    const result = await exportResume(
      generatedResume, 
      format, 
      fileName, 
      sectionOrder || DEFAULT_SECTION_ORDER
    );

    // Return the file as a download
    return new NextResponse(result.buffer, {
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Content-Length": result.buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Export API error:", error);
    return NextResponse.json(
      {
        error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}

