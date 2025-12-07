"use client";

import React from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Target,
  Zap,
  TrendingUp,
  Lightbulb,
} from "lucide-react";
import { JDMatchReport as JDMatchReportType, ATSReport } from "@/types/fireresume-ai";

interface JDMatchReportProps {
  matchReport: JDMatchReportType;
  atsReport: ATSReport;
}

export default function JDMatchReport({ matchReport, atsReport }: JDMatchReportProps) {
  return (
    <div className="space-y-6">
      {/* Overall Match Score */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-400" />
            JD Match Score
          </h3>
          <span
            className={`text-2xl font-bold ${
              matchReport.roleMatch.alignmentScore >= 70
                ? "text-green-400"
                : matchReport.roleMatch.alignmentScore >= 50
                  ? "text-amber-400"
                  : "text-red-400"
            }`}
          >
            {matchReport.roleMatch.alignmentScore}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              matchReport.roleMatch.alignmentScore >= 70
                ? "bg-green-500"
                : matchReport.roleMatch.alignmentScore >= 50
                  ? "bg-amber-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${matchReport.roleMatch.alignmentScore}%` }}
          />
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Based on keyword coverage, skills match, and experience relevance
        </p>
      </div>

      {/* Role Classification */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" />
          Detected Role
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Role Type</span>
            <span className="text-white font-medium">
              {matchReport.roleMatch.inferred.roleType}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Level</span>
            <span className="text-white font-medium">
              {matchReport.roleMatch.inferred.seniorityLevel}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Domain</span>
            <span className="text-white font-medium">
              {matchReport.roleMatch.inferred.domain}
            </span>
          </div>
        </div>
      </div>

      {/* Keyword Coverage */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Keyword Coverage
          </h3>
          <span className="text-sm font-bold text-blue-400">
            {matchReport.coverageScore}%
          </span>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {matchReport.keywordCoverage.map((kw, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-sm gap-2"
            >
              <span className="text-slate-300 break-words flex-1">
                {kw.keyword}
              </span>
              {kw.found ? (
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400/50 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Skills Match */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-sm font-bold text-white mb-3">Skills Match</h3>

        {/* Matched Skills */}
        {matchReport.skillsMatch.matched.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-green-400 mb-1 font-medium">
              Matched ({matchReport.skillsMatch.matched.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {matchReport.skillsMatch.matched.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-green-500/20 text-green-300 rounded text-xs"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing Skills */}
        {matchReport.skillsMatch.missing.length > 0 && (
          <div>
            <p className="text-xs text-red-400 mb-1 font-medium">
              Missing ({matchReport.skillsMatch.missing.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {matchReport.skillsMatch.missing.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded text-xs"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ATS Score */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            {atsReport.passed ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            ATS Compatibility
          </h3>
          <span
            className={`text-lg font-bold ${
              atsReport.score >= 80
                ? "text-green-400"
                : atsReport.score >= 60
                  ? "text-amber-400"
                  : "text-red-400"
            }`}
          >
            {atsReport.score}/100
          </span>
        </div>

        {atsReport.violations.length > 0 && (
          <div className="mb-2">
            <p className="text-xs text-red-400 font-medium mb-1">Issues:</p>
            {atsReport.violations.map((v, idx) => (
              <p key={idx} className="text-xs text-slate-300">
                • {v.rule.description}
              </p>
            ))}
          </div>
        )}

        {atsReport.warnings.length > 0 && (
          <div>
            <p className="text-xs text-amber-400 font-medium mb-1">Warnings:</p>
            {atsReport.warnings.map((w, idx) => (
              <p key={idx} className="text-xs text-slate-300">
                • {w.suggestion || w.rule.description}
              </p>
            ))}
          </div>
        )}

        {atsReport.violations.length === 0 && atsReport.warnings.length === 0 && (
          <p className="text-xs text-green-400">
            All ATS checks passed!
          </p>
        )}
      </div>

      {/* Suggestions */}
      {matchReport.suggestions.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            Suggestions
          </h3>
          <ul className="space-y-2">
            {matchReport.suggestions.map((suggestion, idx) => (
              <li key={idx} className="text-sm text-slate-300 flex gap-2">
                <span className="text-amber-400">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

