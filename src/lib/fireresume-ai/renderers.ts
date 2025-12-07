// FireResume AI - PDF, DOCX, and LaTeX Renderers
// Generates exportable resume files

import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Packer,
  ExternalHyperlink,
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  GeneratedResume,
  ExportResult,
  ExportFormat,
} from "@/types/fireresume-ai";

// Section order types - must match ResumePreview
export type SectionType = "summary" | "education" | "experience" | "projects" | "skills" | "certifications";

// Default section order for exports
export const DEFAULT_SECTION_ORDER: SectionType[] = [
  "summary", "education", "experience", "projects", "skills", "certifications"
];

// ============================================
// LaTeX Renderer
// ============================================

/**
 * Escape special LaTeX characters
 */
function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

/**
 * Format a project link for LaTeX
 */
function formatProjectLink(link: string, title: string): string {
  const escaped = escapeLatex(link);
  return `\\href{${escaped}}{${escapeLatex(title)}}`;
}

/**
 * Render resume to LaTeX source - ATS-friendly, 1-page optimized
 * Matches Lawrence Hua's resume format: clean, professional, dense
 */
export function renderLaTeX(
  resume: GeneratedResume,
  sectionOrder: SectionType[] = DEFAULT_SECTION_ORDER
): string {
  const lines: string[] = [];

  // Document class - 10pt for density, letter paper
  lines.push("\\documentclass[10pt,letterpaper]{article}");
  lines.push("");
  lines.push("% Packages for ATS-friendly, dense resume");
  lines.push("\\usepackage[utf8]{inputenc}");
  lines.push("\\usepackage[T1]{fontenc}");
  lines.push("\\usepackage{times}");
  lines.push("\\usepackage[top=0.4in,bottom=0.4in,left=0.5in,right=0.5in]{geometry}");
  lines.push("\\usepackage{hyperref}");
  lines.push("\\usepackage{enumitem}");
  lines.push("\\usepackage{titlesec}");
  lines.push("\\usepackage{parskip}");
  lines.push("");

  lines.push("\\hypersetup{");
  lines.push("    colorlinks=true,");
  lines.push("    linkcolor=black,");
  lines.push("    urlcolor=black,");
  lines.push(`    pdftitle={Resume - ${escapeLatex(resume.contact.fullName)}},`);
  lines.push(`    pdfauthor={${escapeLatex(resume.contact.fullName)}},`);
  lines.push("}");
  lines.push("");

  lines.push("\\pagenumbering{gobble}");
  lines.push("\\setlength{\\parindent}{0pt}");
  lines.push("\\setlength{\\parskip}{0pt}");
  lines.push("");

  lines.push("\\titleformat{\\section}");
  lines.push("    {\\normalfont\\normalsize\\bfseries\\uppercase}");
  lines.push("    {}");
  lines.push("    {0em}");
  lines.push("    {}");
  lines.push("    [\\vspace{-4pt}\\titlerule\\vspace{2pt}]");
  lines.push("");
  lines.push("\\titlespacing*{\\section}{0pt}{8pt}{4pt}");
  lines.push("");

  lines.push("\\setlist[itemize]{noitemsep,topsep=1pt,parsep=0pt,partopsep=0pt,leftmargin=1.2em,label=$\\bullet$}");
  lines.push("");

  lines.push("\\begin{document}");
  lines.push("");

  // ====== HEADER ======
  lines.push("\\begin{center}");
  lines.push(`{\\Large \\textbf{${escapeLatex(resume.contact.fullName)}}}`);
  lines.push("\\vspace{2pt}");
  lines.push("");

  const contactParts: string[] = [];
  if (resume.contact.location) contactParts.push(escapeLatex(resume.contact.location));
  if (resume.contact.portfolio) {
    contactParts.push(`\\href{${resume.contact.portfolio}}{${escapeLatex(resume.contact.portfolio.replace(/^https?:\/\//, ''))}}`);
  }
  if (resume.contact.email) contactParts.push(escapeLatex(resume.contact.email));
  if (resume.contact.linkedin) {
    const linkedinShort = resume.contact.linkedin.replace(/^https?:\/\/(www\.)?/, '');
    contactParts.push(`\\href{${resume.contact.linkedin}}{${escapeLatex(linkedinShort)}}`);
  }
  if (resume.contact.phone) contactParts.push(escapeLatex(resume.contact.phone));
  
  if (contactParts.length > 0) {
    lines.push(`\\small{${contactParts.join(" | ")}}`);
  }
  lines.push("\\end{center}");
  lines.push("\\vspace{-8pt}");
  lines.push("");

  // ====== SECTION RENDERERS ======
  const includedExperiences = resume.experiences.filter((e) => e.includedInResume);
  const includedProjects = resume.projects.filter((p) => p.includedInResume);

  const renderSummary = () => {
    if (!resume.summary) return;
    lines.push("\\section{Summary}");
    lines.push(escapeLatex(resume.summary));
    lines.push("");
  };

  const renderEducation = () => {
    if (resume.education.length === 0) return;
    lines.push("\\section{Education}");
    for (const edu of resume.education) {
      const instPart = `\\textbf{${escapeLatex(edu.institution)}}`;
      const degreePart = escapeLatex(edu.degree);
      const locPart = edu.location ? escapeLatex(edu.location) : "";
      const datePart = escapeLatex(edu.graduationDate);
      
      lines.push(`${instPart} | ${degreePart} | ${locPart} | ${datePart}`);
      
      const details: string[] = [];
      if (edu.concentration) details.push(`Concentration: ${escapeLatex(edu.concentration)}`);
      if (edu.awards) details.push(`Awards: ${escapeLatex(edu.awards)}`);
      if (edu.gpa) details.push(`GPA: ${escapeLatex(edu.gpa)}`);
      if (details.length > 0) {
        lines.push("\\begin{itemize}[topsep=0pt]");
        for (const detail of details) {
          lines.push(`    \\item \\small{${detail}}`);
        }
        lines.push("\\end{itemize}");
      }
      lines.push("\\vspace{2pt}");
    }
    lines.push("");
  };

  const renderExperience = () => {
    if (includedExperiences.length === 0) return;
    lines.push("\\section{Work Experience}");
    for (const exp of includedExperiences) {
      const titlePart = `\\textbf{${escapeLatex(exp.title)}}`;
      const companyPart = escapeLatex(exp.company);
      const locPart = exp.location ? escapeLatex(exp.location) : "";
      const dateRange = `${escapeLatex(exp.startDate)} -- ${escapeLatex(exp.endDate)}`;
      
      lines.push(`${titlePart} | ${companyPart} | ${locPart} | ${dateRange}`);
      
      if (exp.rewrittenBullets.length > 0) {
        lines.push("\\begin{itemize}[topsep=1pt]");
        for (const bullet of exp.rewrittenBullets.slice(0, 4)) {
          lines.push(`    \\item \\small{${escapeLatex(bullet.rewritten)}}`);
        }
        lines.push("\\end{itemize}");
      }
      lines.push("\\vspace{2pt}");
    }
    lines.push("");
  };

  const renderProjects = () => {
    if (includedProjects.length === 0) return;
    lines.push("\\section{Projects}");
    for (const proj of includedProjects) {
      const techStack = proj.techStack.map(escapeLatex).join(", ");
      let titlePart: string;
      if (proj.link) {
        titlePart = `\\textbf{\\href{${proj.link}}{${escapeLatex(proj.title)}}}`;
      } else {
        titlePart = `\\textbf{${escapeLatex(proj.title)}}`;
      }
      
      lines.push(`${titlePart} | \\small{${techStack}}`);
      
      if (proj.rewrittenBullets.length > 0) {
        lines.push("\\begin{itemize}[topsep=1pt]");
        for (const bullet of proj.rewrittenBullets.slice(0, 2)) {
          lines.push(`    \\item \\small{${escapeLatex(bullet.rewritten)}}`);
        }
        lines.push("\\end{itemize}");
      }
      lines.push("\\vspace{2pt}");
    }
    lines.push("");
  };

  const renderSkills = () => {
    if (resume.skills.length === 0) return;
    lines.push("\\section{Skills}");
    const skillLines: string[] = [];
    for (const category of resume.skills) {
      const skillsJoined = category.skills.map(escapeLatex).join(", ");
      skillLines.push(`\\textbf{${escapeLatex(category.category)}:} ${skillsJoined}`);
    }
    lines.push(skillLines.join(" \\\\ "));
    lines.push("");
  };

  const renderCertifications = () => {
    if (!resume.certifications || resume.certifications.length === 0) return;
    lines.push("\\section{Certifications}");
    const certParts: string[] = [];
    for (const cert of resume.certifications) {
      const datePart = cert.date ? ` (${escapeLatex(cert.date)})` : "";
      certParts.push(`\\textbf{${escapeLatex(cert.name)}}${datePart}`);
    }
    lines.push(certParts.join(" | "));
    lines.push("");
  };

  // ====== RENDER SECTIONS IN ORDER ======
  const sectionRenderers: Record<SectionType, () => void> = {
    summary: renderSummary,
    education: renderEducation,
    experience: renderExperience,
    projects: renderProjects,
    skills: renderSkills,
    certifications: renderCertifications,
  };

  for (const section of sectionOrder) {
    sectionRenderers[section]();
  }

  lines.push("\\end{document}");

  return lines.join("\n");
}

// ============================================
// DOCX Renderer
// ============================================

/**
 * Render resume to DOCX format
 */
export async function renderDOCX(
  resume: GeneratedResume,
  sectionOrder: SectionType[] = DEFAULT_SECTION_ORDER
): Promise<Buffer> {
  const paragraphs: Paragraph[] = [];

  // Header - Name
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: resume.contact.fullName,
          bold: true,
          size: 32,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  // Contact line
  const contactParts: string[] = [];
  if (resume.contact.location) contactParts.push(resume.contact.location);
  if (resume.contact.phone) contactParts.push(resume.contact.phone);
  if (resume.contact.email) contactParts.push(resume.contact.email);

  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: contactParts.join(" | "), size: 20 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  // Links line
  const linkChildren: (TextRun | ExternalHyperlink)[] = [];
  if (resume.contact.linkedin) {
    if (linkChildren.length > 0) linkChildren.push(new TextRun({ text: " | ", size: 20 }));
    linkChildren.push(
      new ExternalHyperlink({
        children: [new TextRun({ text: resume.contact.linkedin, size: 20 })],
        link: resume.contact.linkedin,
      })
    );
  }
  if (resume.contact.portfolio) {
    if (linkChildren.length > 0) linkChildren.push(new TextRun({ text: " | ", size: 20 }));
    linkChildren.push(
      new ExternalHyperlink({
        children: [new TextRun({ text: resume.contact.portfolio, size: 20 })],
        link: resume.contact.portfolio,
      })
    );
  }
  if (resume.contact.github) {
    if (linkChildren.length > 0) linkChildren.push(new TextRun({ text: " | ", size: 20 }));
    linkChildren.push(
      new ExternalHyperlink({
        children: [new TextRun({ text: resume.contact.github, size: 20 })],
        link: resume.contact.github,
      })
    );
  }

  if (linkChildren.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: linkChildren,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
  }

  // ====== SECTION RENDERERS ======
  const includedExperiences = resume.experiences.filter((e) => e.includedInResume);
  const includedProjects = resume.projects.filter((p) => p.includedInResume);

  const renderSummary = () => {
    if (!resume.summary) return;
    paragraphs.push(createSectionHeading("SUMMARY"));
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: resume.summary, size: 22 })],
        spacing: { after: 200 },
      })
    );
  };

  const renderEducation = () => {
    if (resume.education.length === 0) return;
    paragraphs.push(createSectionHeading("EDUCATION"));
    for (const edu of resume.education) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: edu.institution, bold: true, size: 22 }),
            new TextRun({ text: ` | ${edu.degree}`, size: 22 }),
          ],
          spacing: { before: 100 },
        })
      );

      const eduDetails: string[] = [];
      if (edu.location) eduDetails.push(edu.location);
      eduDetails.push(edu.graduationDate);
      if (edu.gpa) eduDetails.push(`GPA: ${edu.gpa}`);

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: eduDetails.join(" | "), italics: true, size: 20 }),
          ],
          spacing: { after: 50 },
        })
      );

      if (edu.concentration) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: `• Concentration: ${edu.concentration}`, size: 20 })],
            indent: { left: 360 },
            spacing: { after: 25 },
          })
        );
      }
      if (edu.awards) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: `• Awards: ${edu.awards}`, size: 20 })],
            indent: { left: 360 },
            spacing: { after: 25 },
          })
        );
      }
    }
    paragraphs.push(new Paragraph({ spacing: { after: 100 } }));
  };

  const renderExperience = () => {
    if (includedExperiences.length === 0) return;
    paragraphs.push(createSectionHeading("WORK EXPERIENCE"));
    for (const exp of includedExperiences) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: exp.title, bold: true, size: 22 }),
            new TextRun({ text: ` | ${exp.company}`, size: 22 }),
          ],
          spacing: { before: 100 },
        })
      );

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${exp.location || ""} | ${exp.startDate} - ${exp.endDate}`,
              italics: true,
              size: 20,
            }),
          ],
          spacing: { after: 50 },
        })
      );

      for (const bullet of exp.rewrittenBullets) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${bullet.rewritten}`, size: 22 })],
            indent: { left: 360 },
            spacing: { after: 50 },
          })
        );
      }
    }
    paragraphs.push(new Paragraph({ spacing: { after: 100 } }));
  };

  const renderProjects = () => {
    if (includedProjects.length === 0) return;
    paragraphs.push(createSectionHeading("PROJECTS"));
    for (const proj of includedProjects) {
      const projChildren: (TextRun | ExternalHyperlink)[] = [
        new TextRun({ text: proj.title, bold: true, size: 22 }),
      ];

      if (proj.link) {
        projChildren.push(new TextRun({ text: " (", size: 22 }));
        projChildren.push(
          new ExternalHyperlink({
            children: [new TextRun({ text: proj.link, size: 22 })],
            link: proj.link,
          })
        );
        projChildren.push(new TextRun({ text: ")", size: 22 }));
      }

      projChildren.push(
        new TextRun({ text: ` | ${proj.techStack.join(", ")}`, size: 20 })
      );

      paragraphs.push(
        new Paragraph({
          children: projChildren,
          spacing: { before: 100 },
        })
      );

      for (const bullet of proj.rewrittenBullets) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${bullet.rewritten}`, size: 22 })],
            indent: { left: 360 },
            spacing: { after: 50 },
          })
        );
      }
    }
    paragraphs.push(new Paragraph({ spacing: { after: 100 } }));
  };

  const renderSkills = () => {
    if (resume.skills.length === 0) return;
    paragraphs.push(createSectionHeading("SKILLS"));
    for (const category of resume.skills) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${category.category}: `, bold: true, size: 22 }),
            new TextRun({ text: category.skills.join(", "), size: 22 }),
          ],
          spacing: { after: 50 },
        })
      );
    }
    paragraphs.push(new Paragraph({ spacing: { after: 100 } }));
  };

  const renderCertifications = () => {
    if (!resume.certifications || resume.certifications.length === 0) return;
    paragraphs.push(createSectionHeading("CERTIFICATIONS"));
    const certTexts = resume.certifications.map(cert => 
      cert.date ? `${cert.name} (${cert.date})` : cert.name
    );
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: certTexts.join(" | "), size: 22 })],
        spacing: { after: 100 },
      })
    );
  };

  // ====== RENDER SECTIONS IN ORDER ======
  const sectionRenderers: Record<SectionType, () => void> = {
    summary: renderSummary,
    education: renderEducation,
    experience: renderExperience,
    projects: renderProjects,
    skills: renderSkills,
    certifications: renderCertifications,
  };

  for (const section of sectionOrder) {
    sectionRenderers[section]();
  }

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

/**
 * Create a section heading paragraph
 */
function createSectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 24, // 12pt
        allCaps: true,
      }),
    ],
    border: {
      bottom: {
        color: "000000",
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    spacing: { before: 200, after: 100 },
  });
}

// ============================================
// PDF Renderer
// ============================================

/**
 * Render resume to PDF format using pdf-lib
 * ATS-friendly, matches the preview exactly
 */
export async function renderPDF(
  resume: GeneratedResume,
  sectionOrder: SectionType[] = DEFAULT_SECTION_ORDER
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  // Create first page - Letter size
  let page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  const margin = 36; // 0.5 inch margins
  const contentWidth = width - 2 * margin;

  let y = height - margin;
  const fontSize = {
    name: 16,
    heading: 10,
    body: 9,
    small: 8,
  };
  const lineHeight = 11;

  const checkNewPage = () => {
    if (y < margin + 50) {
      page = pdfDoc.addPage([612, 792]);
      y = height - margin;
    }
  };

  const sanitizeText = (text: string): string => {
    if (!text || typeof text !== 'string') return "";
    return String(text)
      .split('\n').join(' ')
      .split('\r').join(' ')
      .split('\t').join(' ')
      .replace(/[\u0000-\u001F]/g, ' ')
      .replace(/[\u007F-\u009F]/g, '')
      .replace(/\s+/g, ' ')
      .trim() || '';
  };

  const drawText = (
    rawText: string,
    options: {
      font?: typeof timesRoman;
      size?: number;
      x?: number;
      maxWidth?: number;
      align?: "left" | "center" | "right";
    } = {}
  ) => {
    const text = sanitizeText(rawText);
    if (!text) return;

    const font = options.font || timesRoman;
    const size = options.size || fontSize.body;
    let x = options.x ?? margin;
    const maxWidth = options.maxWidth || contentWidth;

    if (options.align === "center") {
      const textWidth = font.widthOfTextAtSize(text, size);
      x = margin + (contentWidth - textWidth) / 2;
    } else if (options.align === "right") {
      const textWidth = font.widthOfTextAtSize(text, size);
      x = width - margin - textWidth;
    }

    const words = text.split(" ");
    let line = "";
    const lines: string[] = [];

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, size);
      if (testWidth > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);

    for (const l of lines) {
      checkNewPage();
      let drawX = x;
      if (options.align === "center") {
        const textWidth = font.widthOfTextAtSize(l, size);
        drawX = margin + (contentWidth - textWidth) / 2;
      }
      page.drawText(l, { x: drawX, y, size, font, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
  };

  const drawSectionLine = () => {
    page.drawLine({
      start: { x: margin, y: y + 5 },
      end: { x: width - margin, y: y + 5 },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
    y -= 5;
  };

  // ===== HEADER =====
  drawText(resume.contact.fullName, { font: timesRomanBold, size: fontSize.name, align: "center" });
  y -= 2;

  const contactParts: string[] = [];
  if (resume.contact.location) contactParts.push(resume.contact.location);
  if (resume.contact.portfolio) contactParts.push(resume.contact.portfolio.replace(/^https?:\/\//, ''));
  if (resume.contact.email) contactParts.push(resume.contact.email);
  if (resume.contact.linkedin) contactParts.push(resume.contact.linkedin.replace(/^https?:\/\/(www\.)?/, ''));
  if (resume.contact.phone) contactParts.push(resume.contact.phone);
  if (contactParts.length > 0) {
    drawText(contactParts.join(" | "), { size: fontSize.small, align: "center" });
  }
  y -= 8;

  // ===== SECTION RENDERERS =====
  const includedExperiences = resume.experiences.filter((e) => e.includedInResume);
  const includedProjects = resume.projects.filter((p) => p.includedInResume);

  const renderSummary = () => {
    if (!resume.summary) return;
    drawText("SUMMARY", { font: timesRomanBold, size: fontSize.heading });
    drawSectionLine();
    drawText(resume.summary, { size: fontSize.body });
    y -= 8;
  };

  const renderEducation = () => {
    if (resume.education.length === 0) return;
    drawText("EDUCATION", { font: timesRomanBold, size: fontSize.heading });
    drawSectionLine();

    for (const edu of resume.education) {
      checkNewPage();
      // Institution | Degree | Location on one line
      const instText = sanitizeText(edu.institution);
      const degreeText = sanitizeText(` | ${edu.degree}`);
      const locText = edu.location ? sanitizeText(` | ${edu.location}`) : "";
      
      page.drawText(instText, { x: margin, y, size: fontSize.body, font: timesRomanBold, color: rgb(0, 0, 0) });
      let xOffset = margin + timesRomanBold.widthOfTextAtSize(instText, fontSize.body);
      page.drawText(degreeText, { x: xOffset, y, size: fontSize.body, font: timesRoman, color: rgb(0, 0, 0) });
      xOffset += timesRoman.widthOfTextAtSize(degreeText, fontSize.body);
      if (locText) {
        page.drawText(locText, { x: xOffset, y, size: fontSize.body, font: timesRoman, color: rgb(0, 0, 0) });
      }
      // Date on right
      const dateWidth = timesRoman.widthOfTextAtSize(edu.graduationDate, fontSize.body);
      page.drawText(edu.graduationDate, { x: width - margin - dateWidth, y, size: fontSize.body, font: timesRoman, color: rgb(0, 0, 0) });
      y -= lineHeight;

      // Concentration and Awards as bullets
      if (edu.concentration) {
        drawText(`• Concentration: ${edu.concentration}`, { x: margin + 15, size: fontSize.small });
      }
      if (edu.awards) {
        drawText(`• Awards: ${edu.awards}`, { x: margin + 15, size: fontSize.small });
      }
      y -= 3;
    }
    y -= 5;
  };

  const renderExperience = () => {
    if (includedExperiences.length === 0) return;
    drawText("WORK EXPERIENCE", { font: timesRomanBold, size: fontSize.heading });
    drawSectionLine();

    for (const exp of includedExperiences) {
      checkNewPage();
      // Title | Company | Location
      const titleText = sanitizeText(exp.title);
      const companyText = sanitizeText(` | ${exp.company}`);
      const locText = exp.location ? sanitizeText(` | ${exp.location}`) : "";

      page.drawText(titleText, { x: margin, y, size: fontSize.body, font: timesRomanBold, color: rgb(0, 0, 0) });
      let xOffset = margin + timesRomanBold.widthOfTextAtSize(titleText, fontSize.body);
      page.drawText(companyText, { x: xOffset, y, size: fontSize.body, font: timesRoman, color: rgb(0, 0, 0) });
      xOffset += timesRoman.widthOfTextAtSize(companyText, fontSize.body);
      if (locText) {
        page.drawText(locText, { x: xOffset, y, size: fontSize.body, font: timesRoman, color: rgb(0, 0, 0) });
      }
      // Date on right
      const dateStr = `${exp.startDate} - ${exp.endDate}`;
      const dateWidth = timesRoman.widthOfTextAtSize(dateStr, fontSize.body);
      page.drawText(dateStr, { x: width - margin - dateWidth, y, size: fontSize.body, font: timesRoman, color: rgb(0, 0, 0) });
      y -= lineHeight;

      // Bullets
      for (const bullet of exp.rewrittenBullets) {
        checkNewPage();
        drawText(`• ${bullet.rewritten}`, { x: margin + 15 });
      }
      y -= 5;
    }
    y -= 3;
  };

  const renderProjects = () => {
    if (includedProjects.length === 0) return;
    drawText("PROJECTS", { font: timesRomanBold, size: fontSize.heading });
    drawSectionLine();

    for (const proj of includedProjects) {
      checkNewPage();
      // Title | Tech Stack
      const titleText = sanitizeText(proj.title);
      page.drawText(titleText, { x: margin, y, size: fontSize.body, font: timesRomanBold, color: rgb(0, 0, 0) });
      if (proj.techStack.length > 0) {
        const techText = sanitizeText(` | ${proj.techStack.join(", ")}`);
        const xOffset = margin + timesRomanBold.widthOfTextAtSize(titleText, fontSize.body);
        page.drawText(techText, { x: xOffset, y, size: fontSize.body, font: timesRomanItalic, color: rgb(0, 0, 0) });
      }
      if (proj.link) {
        const linkText = sanitizeText(proj.link);
        const linkWidth = timesRoman.widthOfTextAtSize(linkText, fontSize.small);
        page.drawText(linkText, { x: width - margin - linkWidth, y, size: fontSize.small, font: timesRoman, color: rgb(0, 0, 0.7) });
      }
      y -= lineHeight;

      // Bullets
      for (const bullet of proj.rewrittenBullets) {
        checkNewPage();
        drawText(`• ${bullet.rewritten}`, { x: margin + 15 });
      }
      y -= 5;
    }
    y -= 3;
  };

  const renderSkills = () => {
    if (resume.skills.length === 0) return;
    drawText("SKILLS", { font: timesRomanBold, size: fontSize.heading });
    drawSectionLine();

    for (const category of resume.skills) {
      checkNewPage();
      const catName = sanitizeText(`${category.category}: `);
      const skillsText = sanitizeText(category.skills.join(", "));
      page.drawText(catName, { x: margin, y, size: fontSize.body, font: timesRomanBold, color: rgb(0, 0, 0) });
      const boldWidth = timesRomanBold.widthOfTextAtSize(catName, fontSize.body);
      // Handle word wrap for skills if too long
      const remainingWidth = contentWidth - boldWidth;
      const words = skillsText.split(" ");
      let line = "";
      let firstLine = true;
      
      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        const testWidth = timesRoman.widthOfTextAtSize(testLine, fontSize.body);
        const maxW = firstLine ? remainingWidth : contentWidth;
        if (testWidth > maxW && line) {
          if (firstLine) {
            page.drawText(line, { x: margin + boldWidth, y, size: fontSize.body, font: timesRoman, color: rgb(0, 0, 0) });
            firstLine = false;
          } else {
            page.drawText(line, { x: margin, y, size: fontSize.body, font: timesRoman, color: rgb(0, 0, 0) });
          }
          y -= lineHeight;
          checkNewPage();
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) {
        if (firstLine) {
          page.drawText(line, { x: margin + boldWidth, y, size: fontSize.body, font: timesRoman, color: rgb(0, 0, 0) });
        } else {
          page.drawText(line, { x: margin, y, size: fontSize.body, font: timesRoman, color: rgb(0, 0, 0) });
        }
        y -= lineHeight;
      }
    }
    y -= 5;
  };

  const renderCertifications = () => {
    if (!resume.certifications || resume.certifications.length === 0) return;
    drawText("CERTIFICATIONS", { font: timesRomanBold, size: fontSize.heading });
    drawSectionLine();

    const certTexts = resume.certifications.map(cert => 
      cert.date ? `${cert.name} (${cert.date})` : cert.name
    );
    drawText(certTexts.join(" | "), { size: fontSize.body });
    y -= 5;
  };

  // ===== RENDER SECTIONS IN ORDER =====
  const sectionRenderers: Record<SectionType, () => void> = {
    summary: renderSummary,
    education: renderEducation,
    experience: renderExperience,
    projects: renderProjects,
    skills: renderSkills,
    certifications: renderCertifications,
  };

  for (const section of sectionOrder) {
    sectionRenderers[section]();
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ============================================
// Plain Text Renderer (for debugging)
// ============================================

/**
 * Render resume to plain text
 */
export function renderPlainText(
  resume: GeneratedResume,
  sectionOrder: SectionType[] = DEFAULT_SECTION_ORDER
): string {
  const lines: string[] = [];

  // Header
  lines.push(resume.contact.fullName);
  lines.push("=".repeat(resume.contact.fullName.length));
  lines.push("");

  const contactParts: string[] = [];
  if (resume.contact.location) contactParts.push(resume.contact.location);
  if (resume.contact.phone) contactParts.push(resume.contact.phone);
  if (resume.contact.email) contactParts.push(resume.contact.email);
  lines.push(contactParts.join(" | "));

  const linkParts: string[] = [];
  if (resume.contact.linkedin) linkParts.push(resume.contact.linkedin);
  if (resume.contact.portfolio) linkParts.push(resume.contact.portfolio);
  if (resume.contact.github) linkParts.push(resume.contact.github);
  if (linkParts.length > 0) {
    lines.push(linkParts.join(" | "));
  }
  lines.push("");

  // ====== SECTION RENDERERS ======
  const includedExperiences = resume.experiences.filter((e) => e.includedInResume);
  const includedProjects = resume.projects.filter((p) => p.includedInResume);

  const renderSummary = () => {
    if (!resume.summary) return;
    lines.push("SUMMARY");
    lines.push("-".repeat(7));
    lines.push(resume.summary);
    lines.push("");
  };

  const renderEducation = () => {
    if (resume.education.length === 0) return;
    lines.push("EDUCATION");
    lines.push("-".repeat(9));
    for (const edu of resume.education) {
      lines.push(`${edu.institution} | ${edu.degree}`);
      const eduDetails: string[] = [];
      if (edu.location) eduDetails.push(edu.location);
      eduDetails.push(edu.graduationDate);
      if (edu.gpa) eduDetails.push(`GPA: ${edu.gpa}`);
      lines.push(eduDetails.join(" | "));
      if (edu.concentration) lines.push(`  • Concentration: ${edu.concentration}`);
      if (edu.awards) lines.push(`  • Awards: ${edu.awards}`);
      lines.push("");
    }
  };

  const renderExperience = () => {
    if (includedExperiences.length === 0) return;
    lines.push("WORK EXPERIENCE");
    lines.push("-".repeat(15));
    for (const exp of includedExperiences) {
      lines.push(`${exp.title} | ${exp.company}`);
      lines.push(`${exp.location || ""} | ${exp.startDate} - ${exp.endDate}`);
      for (const bullet of exp.rewrittenBullets) {
        lines.push(`  • ${bullet.rewritten}`);
      }
      lines.push("");
    }
  };

  const renderProjects = () => {
    if (includedProjects.length === 0) return;
    lines.push("PROJECTS");
    lines.push("-".repeat(8));
    for (const proj of includedProjects) {
      const link = proj.link ? ` (${proj.link})` : "";
      lines.push(`${proj.title}${link} | ${proj.techStack.join(", ")}`);
      for (const bullet of proj.rewrittenBullets) {
        lines.push(`  • ${bullet.rewritten}`);
      }
      lines.push("");
    }
  };

  const renderSkills = () => {
    if (resume.skills.length === 0) return;
    lines.push("SKILLS");
    lines.push("-".repeat(6));
    for (const category of resume.skills) {
      lines.push(`${category.category}: ${category.skills.join(", ")}`);
    }
    lines.push("");
  };

  const renderCertifications = () => {
    if (!resume.certifications || resume.certifications.length === 0) return;
    lines.push("CERTIFICATIONS");
    lines.push("-".repeat(14));
    const certTexts = resume.certifications.map(cert => 
      cert.date ? `${cert.name} (${cert.date})` : cert.name
    );
    lines.push(certTexts.join(" | "));
    lines.push("");
  };

  // ====== RENDER SECTIONS IN ORDER ======
  const sectionRenderers: Record<SectionType, () => void> = {
    summary: renderSummary,
    education: renderEducation,
    experience: renderExperience,
    projects: renderProjects,
    skills: renderSkills,
    certifications: renderCertifications,
  };

  for (const section of sectionOrder) {
    sectionRenderers[section]();
  }

  return lines.join("\n");
}

// ============================================
// Export Function
// ============================================

/**
 * Export resume in specified format
 */
export async function exportResume(
  resume: GeneratedResume,
  format: ExportFormat,
  fileName?: string,
  sectionOrder: SectionType[] = DEFAULT_SECTION_ORDER
): Promise<ExportResult> {
  const baseName = fileName || `resume-${Date.now()}`;

  switch (format) {
    case "pdf": {
      const buffer = await renderPDF(resume, sectionOrder);
      return {
        format: "pdf",
        buffer,
        fileName: `${baseName}.pdf`,
        mimeType: "application/pdf",
      };
    }

    case "docx": {
      const buffer = await renderDOCX(resume, sectionOrder);
      return {
        format: "docx",
        buffer,
        fileName: `${baseName}.docx`,
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    }

    case "latex": {
      const latex = renderLaTeX(resume, sectionOrder);
      return {
        format: "latex",
        buffer: Buffer.from(latex, "utf-8"),
        fileName: `${baseName}.tex`,
        mimeType: "application/x-tex",
      };
    }

    case "txt": {
      const text = renderPlainText(resume, sectionOrder);
      return {
        format: "txt",
        buffer: Buffer.from(text, "utf-8"),
        fileName: `${baseName}.txt`,
        mimeType: "text/plain",
      };
    }

    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

