"use client";

import React from "react";
import { GeneratedResume } from "@/types/fireresume-ai";

// Default section order - can be customized
export type SectionType = "summary" | "education" | "experience" | "projects" | "skills" | "certifications";

// Recommended section orders based on career stage
export const SECTION_ORDERS = {
  // For recent grads - education first
  recentGrad: ["summary", "education", "experience", "projects", "skills", "certifications"] as SectionType[],
  // For experienced professionals - experience first
  experienced: ["summary", "experience", "skills", "projects", "education", "certifications"] as SectionType[],
  // For career changers - summary and skills first
  careerChanger: ["summary", "skills", "experience", "projects", "education", "certifications"] as SectionType[],
  // Technical roles - skills prominent
  technical: ["summary", "skills", "experience", "projects", "education", "certifications"] as SectionType[],
};

interface ResumePreviewProps {
  resume: GeneratedResume;
  sectionOrder?: SectionType[];
  onEdit?: (
    section: string,
    index: number,
    field: string,
    value: string
  ) => void;
}

export default function ResumePreview({ 
  resume, 
  sectionOrder = SECTION_ORDERS.recentGrad 
}: ResumePreviewProps) {
  const includedExperiences = resume.experiences.filter((e) => e.includedInResume);
  const includedProjects = resume.projects.filter((p) => p.includedInResume);

  // Section components
  const sections: Record<SectionType, React.ReactNode> = {
    summary: resume.summary ? (
      <section key="summary">
        <h2 className="text-xs font-bold uppercase border-b border-black mb-2">
          Summary
        </h2>
        <p className="text-xs leading-relaxed">{resume.summary}</p>
      </section>
    ) : null,

    education: resume.education.length > 0 ? (
      <section key="education">
        <h2 className="text-xs font-bold uppercase border-b border-black mb-2">
          Education
        </h2>
        <div className="space-y-2">
          {resume.education.map((edu, idx) => (
            <div key={edu.id || idx}>
              <div className="flex justify-between items-baseline text-xs">
                <div>
                  <span className="font-bold">{edu.institution}</span>
                  <span className="mx-1">|</span>
                  <span>{edu.degree}</span>
                  {edu.location && (
                    <>
                      <span className="mx-1">|</span>
                      <span>{edu.location}</span>
                    </>
                  )}
                </div>
                <span className="font-medium">{edu.graduationDate}</span>
              </div>
              {(edu.concentration || edu.awards) && (
                <ul className="ml-4 mt-0.5 text-xs">
                  {edu.concentration && (
                    <li className="list-disc list-outside ml-2">
                      Concentration: {edu.concentration}
                    </li>
                  )}
                  {edu.awards && (
                    <li className="list-disc list-outside ml-2">
                      Awards: {edu.awards}
                    </li>
                  )}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    ) : null,

    experience: includedExperiences.length > 0 ? (
      <section key="experience">
        <h2 className="text-xs font-bold uppercase border-b border-black mb-2">
          Work Experience
        </h2>
        <div className="space-y-3">
          {includedExperiences.map((exp, idx) => (
            <div key={exp.id || idx}>
              <div className="flex justify-between items-baseline text-xs">
                <div>
                  <span className="font-bold">{exp.title}</span>
                  <span className="mx-1">|</span>
                  <span>{exp.company}</span>
                  {exp.location && (
                    <>
                      <span className="mx-1">|</span>
                      <span>{exp.location}</span>
                    </>
                  )}
                </div>
                <span className="font-medium whitespace-nowrap">
                  {exp.startDate} – {exp.endDate}
                </span>
              </div>
              <ul className="ml-4 mt-1 space-y-0.5">
                {exp.rewrittenBullets.map((bullet, bulletIdx) => (
                  <li
                    key={bulletIdx}
                    className="text-xs list-disc list-outside ml-2"
                  >
                    {bullet.rewritten}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    ) : null,

    projects: includedProjects.length > 0 ? (
      <section key="projects">
        <h2 className="text-xs font-bold uppercase border-b border-black mb-2">
          Projects
        </h2>
        <div className="space-y-2">
          {includedProjects.map((proj, idx) => (
            <div key={proj.id || idx}>
              <div className="text-xs">
                <span className="font-bold">{proj.title}</span>
                {proj.techStack.length > 0 && (
                  <>
                    <span className="mx-1">|</span>
                    <span className="italic">{proj.techStack.join(", ")}</span>
                  </>
                )}
                {proj.link && (
                  <>
                    <span className="mx-1">|</span>
                    <a 
                      href={proj.link} 
                      className="text-blue-700 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {proj.link}
                    </a>
                  </>
                )}
              </div>
              <ul className="ml-4 mt-0.5 space-y-0.5">
                {proj.rewrittenBullets.map((bullet, bulletIdx) => (
                  <li
                    key={bulletIdx}
                    className="text-xs list-disc list-outside ml-2"
                  >
                    {bullet.rewritten}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    ) : null,

    skills: resume.skills.length > 0 ? (
      <section key="skills">
        <h2 className="text-xs font-bold uppercase border-b border-black mb-2">
          Skills
        </h2>
        <div className="space-y-0.5">
          {resume.skills.map((category, idx) => (
            <div key={idx} className="text-xs">
              <span className="font-bold">{category.category}:</span>{" "}
              <span>{category.skills.join(", ")}</span>
            </div>
          ))}
        </div>
      </section>
    ) : null,

    certifications: resume.certifications && resume.certifications.length > 0 ? (
      <section key="certifications">
        <h2 className="text-xs font-bold uppercase border-b border-black mb-2">
          Certifications
        </h2>
        <div className="text-xs">
          {resume.certifications.map((cert, idx) => (
            <span key={cert.id || idx}>
              {idx > 0 && " | "}
              <span className="font-semibold">{cert.name}</span>
              {cert.date && ` (${cert.date})`}
            </span>
          ))}
        </div>
      </section>
    ) : null,
  };

  return (
    <div className="bg-white text-black rounded-lg shadow-xl overflow-hidden">
      {/* Resume content styled like a professional ATS-friendly resume */}
      <div 
        className="p-6 space-y-4" 
        style={{ 
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: "10pt",
          lineHeight: "1.3",
        }}
      >
        {/* ========== HEADER (Always first) ========== */}
        <header className="text-center border-b border-black pb-2">
          <h1 className="text-lg font-bold mb-1">{resume.contact.fullName}</h1>
          <div className="text-xs flex flex-wrap justify-center items-center gap-1">
            {resume.contact.location && <span>{resume.contact.location}</span>}
            {resume.contact.portfolio && (
              <>
                <span className="text-gray-400">|</span>
                <a href={resume.contact.portfolio} className="text-blue-700 hover:underline">
                  {resume.contact.portfolio.replace(/^https?:\/\//, '')}
                </a>
              </>
            )}
            {resume.contact.email && (
              <>
                <span className="text-gray-400">|</span>
                <span>{resume.contact.email}</span>
              </>
            )}
            {resume.contact.linkedin && (
              <>
                <span className="text-gray-400">|</span>
                <a href={resume.contact.linkedin} className="text-blue-700 hover:underline">
                  {resume.contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}
                </a>
              </>
            )}
            {resume.contact.phone && (
              <>
                <span className="text-gray-400">|</span>
                <span>{resume.contact.phone}</span>
              </>
            )}
          </div>
        </header>

        {/* ========== SECTIONS (In customizable order) ========== */}
        {sectionOrder.map((sectionKey) => sections[sectionKey])}
      </div>

      {/* Page indicator */}
      <div className="bg-gray-100 px-4 py-2 text-center text-xs text-gray-500 border-t">
        {resume.layoutPlan.pageCount} page resume • ATS-optimized
      </div>
    </div>
  );
}
