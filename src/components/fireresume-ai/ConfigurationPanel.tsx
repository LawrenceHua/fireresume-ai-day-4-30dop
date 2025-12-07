"use client";

import React from "react";
import { Settings, FileText, List, Briefcase, FolderGit2, GraduationCap, Award, ArrowUpDown } from "lucide-react";
import { ResumeConfig, JDAnalysis } from "@/types/fireresume-ai";
import { SectionType, SECTION_ORDERS } from "./ResumePreview";

export type SectionOrderPreset = "recentGrad" | "experienced" | "careerChanger" | "technical";

const PRESET_LABELS: Record<SectionOrderPreset, { label: string; description: string }> = {
  recentGrad: { label: "Recent Grad", description: "Education first, then experience" },
  experienced: { label: "Experienced", description: "Experience first, skills prominent" },
  careerChanger: { label: "Career Changer", description: "Summary & skills highlight transferable skills" },
  technical: { label: "Technical", description: "Skills & projects prominent" },
};

interface ConfigurationPanelProps {
  config: ResumeConfig;
  onChange: (config: ResumeConfig) => void;
  jdAnalysis: JDAnalysis | null;
  sectionOrder?: SectionType[];
  onSectionOrderChange?: (order: SectionType[]) => void;
  sectionOrderPreset?: SectionOrderPreset;
  onSectionOrderPresetChange?: (preset: SectionOrderPreset) => void;
}

export default function ConfigurationPanel({
  config,
  onChange,
  jdAnalysis,
  sectionOrderPreset = "recentGrad",
  onSectionOrderPresetChange,
}: ConfigurationPanelProps) {
  const updateConfig = (updates: Partial<ResumeConfig>) => {
    onChange({ ...config, ...updates });
  };

  const toggleSection = (section: keyof ResumeConfig["includeSections"]) => {
    onChange({
      ...config,
      includeSections: {
        ...config.includeSections,
        [section]: !config.includeSections[section],
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Detected Role */}
      {jdAnalysis && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-orange-400" />
            Detected Role
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Title</p>
              <p className="text-white font-medium truncate">{jdAnalysis.jobTitle}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Level</p>
              <p className="text-white font-medium">{jdAnalysis.seniorityLevel}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Type</p>
              <p className="text-white font-medium">{jdAnalysis.roleType}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Domain</p>
              <p className="text-white font-medium">{jdAnalysis.domain}</p>
            </div>
          </div>
        </div>
      )}

      {/* Section Order */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-cyan-400" />
          Section Order
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PRESET_LABELS) as SectionOrderPreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => onSectionOrderPresetChange?.(preset)}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all text-left ${
                sectionOrderPreset === preset
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              <div className="font-semibold">{PRESET_LABELS[preset].label}</div>
              <div className={`text-[10px] mt-0.5 ${sectionOrderPreset === preset ? "text-cyan-100" : "text-slate-400"}`}>
                {PRESET_LABELS[preset].description}
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Current order: {SECTION_ORDERS[sectionOrderPreset].filter(s => config.includeSections[s as keyof typeof config.includeSections] !== false).join(" → ")}
        </p>
      </div>

      {/* Page Count */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          Page Count
        </h3>
        <div className="flex gap-3">
          <button
            onClick={() => updateConfig({ pageCount: 1 })}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              config.pageCount === 1
                ? "bg-orange-500 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            1 Page
          </button>
          <button
            onClick={() => updateConfig({ pageCount: 2 })}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              config.pageCount === 2
                ? "bg-orange-500 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            2 Pages
          </button>
        </div>
      </div>

      {/* Summary (Optional) */}
      {config.includeSections.summary && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <List className="w-4 h-4 text-purple-400" />
            Summary Length
          </h3>
          <div className="flex gap-2">
            {(["short", "medium", "long"] as const).map((length) => (
              <button
                key={length}
                onClick={() => updateConfig({ summaryLength: length })}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all capitalize ${
                  config.summaryLength === length
                    ? "bg-purple-500 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {length}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {config.summaryLength === "short"
              ? "2 sentences - concise"
              : config.summaryLength === "medium"
                ? "3 sentences - balanced"
                : "4 sentences - detailed"}
          </p>
        </div>
      )}
      
      {!config.includeSections.summary && (
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <List className="w-4 h-4" />
            Summary disabled - your experience speaks for itself
          </p>
        </div>
      )}

      {/* Bullets per Experience */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4 text-green-400" />
          Bullets per Role
        </h3>
        <div className="flex gap-2">
          {[2, 3, 4].map((count) => (
            <button
              key={count}
              onClick={() => updateConfig({ maxBulletsPerExperience: count })}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                config.maxBulletsPerExperience === count
                  ? "bg-green-500 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Max Projects */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <FolderGit2 className="w-4 h-4 text-amber-400" />
          Max Projects
        </h3>
        <div className="flex gap-2">
          {[1, 2, 3].map((count) => (
            <button
              key={count}
              onClick={() => updateConfig({ maxProjects: count })}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                config.maxProjects === count
                  ? "bg-amber-500 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Include/Exclude Sections */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-sm font-bold text-white mb-3">Include Sections</h3>
        <div className="space-y-2">
          {[
            { key: "summary", label: "Summary", icon: List },
            { key: "skills", label: "Skills", icon: Settings },
            { key: "experience", label: "Experience", icon: Briefcase },
            { key: "projects", label: "Projects", icon: FolderGit2 },
            { key: "education", label: "Education", icon: GraduationCap },
            { key: "certifications", label: "Certifications", icon: Award },
          ].map(({ key, label, icon: Icon }) => (
            <label
              key={key}
              className="flex items-center justify-between cursor-pointer group"
            >
              <span className="flex items-center gap-2 text-sm text-slate-300 group-hover:text-white">
                <Icon className="w-4 h-4" />
                {label}
              </span>
              <button
                onClick={() =>
                  toggleSection(key as keyof ResumeConfig["includeSections"])
                }
                className={`w-10 h-5 rounded-full transition-all relative ${
                  config.includeSections[key as keyof ResumeConfig["includeSections"]]
                    ? "bg-orange-500"
                    : "bg-slate-600"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${
                    config.includeSections[key as keyof ResumeConfig["includeSections"]]
                      ? "left-5"
                      : "left-0.5"
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
