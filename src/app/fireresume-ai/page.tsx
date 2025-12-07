"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Settings,
  Eye,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import FileUpload from "@/components/fireresume-ai/FileUpload";
import ConfigurationPanel, { SectionOrderPreset } from "@/components/fireresume-ai/ConfigurationPanel";
import ResumePreview, { SECTION_ORDERS } from "@/components/fireresume-ai/ResumePreview";
import JDMatchReport from "@/components/fireresume-ai/JDMatchReport";
import {
  AppScreen,
  ResumeData,
  JDAnalysis,
  ResumeConfig,
  GeneratedResume,
  DEFAULT_CONFIG,
  ExportFormat,
} from "@/types/fireresume-ai";

type ExportingState = ExportFormat | null;

export default function FireResumeAIPage() {
  // Screen state
  const [screen, setScreen] = useState<AppScreen>("input");

  // Data state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState<string>("");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [jdAnalysis, setJdAnalysis] = useState<JDAnalysis | null>(null);
  const [config, setConfig] = useState<ResumeConfig>(DEFAULT_CONFIG);
  const [generatedResume, setGeneratedResume] = useState<GeneratedResume | null>(
    null
  );

  // Section order preset
  const [sectionOrderPreset, setSectionOrderPreset] = useState<SectionOrderPreset>("recentGrad");

  // Loading and error states
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState<ExportingState>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle upload and parse
  const handleUpload = useCallback(async () => {
    if (!resumeFile && !jdFile && !jdText.trim()) {
      setError("Please upload a resume and job description");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (resumeFile) formData.append("resume", resumeFile);
      if (jdFile) formData.append("jdFile", jdFile);
      if (jdText.trim()) formData.append("jdText", jdText.trim());

      const response = await fetch("/api/fireresume-ai/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.errors && data.errors.length > 0) {
        setError(data.errors.join(". "));
        return;
      }

      if (data.resumeData) {
        setResumeData(data.resumeData);
      }

      if (data.jdAnalysis) {
        setJdAnalysis(data.jdAnalysis);
      }

      // Move to configuration screen if we have both
      if (data.resumeData && data.jdAnalysis) {
        setScreen("configuration");
      } else if (!data.resumeData) {
        setError("Failed to parse resume. Please try a different file format.");
      } else if (!data.jdAnalysis) {
        setError(
          "Failed to analyze job description. Please try pasting the text directly."
        );
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload files. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, [resumeFile, jdFile, jdText]);

  // Handle generation
  const handleGenerate = useCallback(async () => {
    if (!resumeData || !jdAnalysis) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/fireresume-ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeData,
          jdAnalysis,
          config,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setGeneratedResume(data.generatedResume);
      setScreen("preview");
    } catch (err) {
      console.error("Generation error:", err);
      setError("Failed to generate resume. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [resumeData, jdAnalysis, config]);

  // Handle export
  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!generatedResume) return;

      setIsExporting(format);
      setError(null);

      try {
        const response = await fetch("/api/fireresume-ai/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generatedResume,
            format,
            fileName: `resume-${jdAnalysis?.roleType.replace(/\s+/g, "-").toLowerCase() || "tailored"}`,
            sectionOrder: SECTION_ORDERS[sectionOrderPreset],
          }),
        });

        if (!response.ok) {
          throw new Error("Export failed");
        }

        // Get the blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          response.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") ||
          `resume.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        console.error("Export error:", err);
        setError(`Failed to export ${format.toUpperCase()}. Please try again.`);
      } finally {
        setIsExporting(null);
      }
    },
    [generatedResume, jdAnalysis]
  );

  // Handle regeneration
  const handleRegenerate = useCallback(() => {
    setScreen("configuration");
    setGeneratedResume(null);
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (screen === "configuration") {
      setScreen("input");
      setResumeData(null);
      setJdAnalysis(null);
    } else if (screen === "preview") {
      setScreen("configuration");
      setGeneratedResume(null);
    }
  }, [screen]);

  return (
    <div className="min-h-screen bg-[#050304] text-slate-200">
      <main className="container mx-auto px-4 py-24 max-w-6xl">
        {/* Back link */}
        <Link
          href="/30-days-of-product"
          className="inline-flex items-center text-slate-400 hover:text-amber-400 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to 30 Days Challenge
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              Fire<span className="text-orange-500">Resume</span> AI
            </h1>
          </div>
          <p className="text-slate-400 max-w-xl mx-auto">
            Generate ATS-friendly, tailored resumes in seconds. Upload your resume
            and job description, and let AI optimize your experience for maximum
            impact.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {[
            { id: "input", label: "Upload", icon: Upload },
            { id: "configuration", label: "Configure", icon: Settings },
            { id: "preview", label: "Preview", icon: Eye },
          ].map((step, idx) => {
            const isActive = screen === step.id;
            const isPast =
              (screen === "configuration" && step.id === "input") ||
              (screen === "preview" &&
                (step.id === "input" || step.id === "configuration"));
            const Icon = step.icon;

            return (
              <React.Fragment key={step.id}>
                {idx > 0 && (
                  <div
                    className={`w-12 h-0.5 ${
                      isPast || isActive ? "bg-orange-500" : "bg-slate-700"
                    }`}
                  />
                )}
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive
                      ? "bg-orange-500 text-white"
                      : isPast
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {isPast ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium hidden sm:inline">
                    {step.label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Screen 1: Input */}
        {screen === "input" && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Upload className="w-5 h-5 text-orange-400" />
                Upload Your Documents
              </h2>

              <div className="space-y-6">
                {/* Resume Upload */}
                <FileUpload
                  label="Your Resume"
                  accept=".pdf,.docx,.txt"
                  onFileSelect={setResumeFile}
                  file={resumeFile}
                  helperText="We'll extract your experience, skills, and education"
                />

                {/* JD Upload or Paste */}
                <div className="space-y-4">
                  <FileUpload
                    label="Job Description (File)"
                    accept=".pdf,.docx,.txt"
                    onFileSelect={setJdFile}
                    file={jdFile}
                    helperText="Or paste the job description below"
                  />

                  <div className="relative">
                    <div className="absolute inset-x-0 top-0 flex justify-center -translate-y-1/2">
                      <span className="bg-slate-900 px-4 text-xs text-slate-500">
                        OR
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Paste Job Description
                    </label>
                    <textarea
                      value={jdText}
                      onChange={(e) => setJdText(e.target.value)}
                      placeholder="Paste the job description text here..."
                      className="w-full h-40 p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={handleUpload}
              disabled={isUploading || (!resumeFile && !jdFile && !jdText.trim())}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Analyze Documents
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Screen 2: Configuration */}
        {screen === "configuration" && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Configuration */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBack}
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-orange-400" />
                  Configure Resume
                </h2>
              </div>

              <ConfigurationPanel
                config={config}
                onChange={setConfig}
                jdAnalysis={jdAnalysis}
                sectionOrderPreset={sectionOrderPreset}
                onSectionOrderPresetChange={setSectionOrderPreset}
              />
            </div>

            {/* Right: Preview of extracted data */}
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-400" />
                Extracted Data Preview
              </h2>

              <div 
                className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-4 max-h-[60vh] overflow-y-auto overscroll-contain"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 transparent' }}
              >
                {/* Contact */}
                {resumeData?.contact && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-300 mb-1">Contact</h3>
                    <p className="text-sm text-white">{resumeData.contact.fullName}</p>
                    <p className="text-xs text-slate-400">{resumeData.contact.email}</p>
                    {resumeData.contact.phone && (
                      <p className="text-xs text-slate-400">{resumeData.contact.phone}</p>
                    )}
                    {resumeData.contact.location && (
                      <p className="text-xs text-slate-400">{resumeData.contact.location}</p>
                    )}
                  </div>
                )}

                {/* Education */}
                {resumeData?.education && resumeData.education.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-300 mb-1">
                      Education ({resumeData.education.length})
                    </h3>
                    {resumeData.education.map((edu, idx) => (
                      <div key={idx} className="text-sm mb-2">
                        <p className="text-white font-medium">{edu.institution}</p>
                        <p className="text-slate-400 text-xs">
                          {edu.degree} • {edu.graduationDate}
                        </p>
                        {edu.concentration && (
                          <p className="text-slate-500 text-xs">Concentration: {edu.concentration}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Experiences - Show ALL */}
                {resumeData?.experiences && resumeData.experiences.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-300 mb-1">
                      Experience ({resumeData.experiences.length})
                    </h3>
                    {resumeData.experiences.map((exp, idx) => (
                      <div key={idx} className="text-sm mb-2">
                        <p className="text-white font-medium">{exp.title}</p>
                        <p className="text-slate-400 text-xs">
                          {exp.company} • {exp.startDate} - {exp.endDate}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {exp.bullets?.length || 0} bullets
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Projects - Show ALL */}
                {resumeData?.projects && resumeData.projects.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-300 mb-1">
                      Projects ({resumeData.projects.length})
                    </h3>
                    {resumeData.projects.map((proj, idx) => (
                      <div key={idx} className="text-sm mb-2">
                        <p className="text-white font-medium">{proj.title}</p>
                        <p className="text-slate-400 text-xs">
                          {proj.techStack.join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Skills - Show ALL */}
                {resumeData?.skills && resumeData.skills.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-300 mb-1">
                      Skills ({resumeData.skills.reduce((acc, c) => acc + c.skills.length, 0)})
                    </h3>
                    {resumeData.skills.map((category, idx) => (
                      <div key={idx} className="mb-2">
                        <p className="text-xs text-slate-400 mb-1">{category.category}:</p>
                        <div className="flex flex-wrap gap-1">
                          {category.skills.map((skill, skillIdx) => (
                            <span
                              key={skillIdx}
                              className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-xs"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !resumeData || !jdAnalysis}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Resume...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Tailored Resume
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Screen 3: Preview */}
        {screen === "preview" && generatedResume && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Resume Preview */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBack}
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Configure
                </button>
                <button
                  onClick={handleRegenerate}
                  className="text-orange-400 hover:text-orange-300 flex items-center gap-1 text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </button>
              </div>

              <ResumePreview 
                resume={generatedResume} 
                sectionOrder={SECTION_ORDERS[sectionOrderPreset]}
              />

              {/* Export Buttons */}
              <div className="flex flex-wrap gap-3">
                {(["pdf", "docx", "latex", "txt"] as ExportFormat[]).map((format) => (
                  <button
                    key={format}
                    onClick={() => handleExport(format)}
                    disabled={isExporting !== null}
                    className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      format === "pdf"
                        ? "bg-red-600 hover:bg-red-500 text-white"
                        : format === "docx"
                          ? "bg-blue-600 hover:bg-blue-500 text-white"
                          : "bg-slate-700 hover:bg-slate-600 text-white"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isExporting === format ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: JD Match Report */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-green-400" />
                Match Report
              </h2>

              <JDMatchReport
                matchReport={generatedResume.jdMatchReport}
                atsReport={generatedResume.atsReport}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

