import React, { useState } from "react";
import { X, Database, Copy, Check, Download, Terminal, Layers, FileCode } from "lucide-react";
import { SportyEntryPoint, SportyEvent } from "../types";
import { CombinedMatchData } from "../services/sportyApi";

interface DataInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  entryPoints: SportyEntryPoint[];
  events: SportyEvent[];
  bearerToken: string;
}

export const DataInspector: React.FC<DataInspectorProps> = ({
  isOpen,
  onClose,
  entryPoints,
  events,
  bearerToken,
}) => {
  const [activeTab, setActiveTab] = useState<
    "entrypoints" | "events" | "curl_instant" | "curl_entrypoints"
  >("entrypoints");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentPayload = activeTab === "entrypoints" ? entryPoints : events;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentPayload, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sporty_${activeTab}_export.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const curlInstantLeagues = `curl "https://hg-event-api-prod.sporty-tech.net/api/instantleagues/8035/matches" \\
  -H "Authorization: Bearer ${bearerToken}" \\
  -H "Referer: https://bet261.mg/" \\
  -H "Accept-Language: fr" \\
  -H "App-Version: 34378" \\
  -H "Accept: application/json, text/plain, */*"`;

  const curlEntryPoints = `curl "https://hg-event-api-prod.sporty-tech.net/api/eventcategories/entrypoints?fr" \\
  -H "Authorization: Bearer ${bearerToken}" \\
  -H "Referer: https://bet261.mg/" \\
  -H "Accept-Language: fr" \\
  -H "App-Version: 34378" \\
  -H "Accept: application/json, text/plain, */*"`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Collecteur de Données Brutes (Sporty API)</h2>
              <p className="text-xs text-slate-400">Inspecter les requêtes cURL et réponses JSON directes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950 border-b border-slate-800 gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab("entrypoints")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "entrypoints"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              Compétitions ({entryPoints.length})
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "events"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              Matchs ({events.length})
            </button>
            <button
              onClick={() => setActiveTab("curl_instant")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "curl_instant"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              cURL InstantLeagues (8035)
            </button>
            <button
              onClick={() => setActiveTab("curl_entrypoints")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "curl_entrypoints"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              cURL Compétitions
            </button>
          </div>

          {!activeTab.startsWith("curl") && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger JSON</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === "curl_instant" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>cURL InstantLeagues Matches (8035 - English League)</span>
                </span>
                <button
                  onClick={() => handleCopy(curlInstantLeagues)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copié !" : "Copier cURL"}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                {curlInstantLeagues}
              </pre>
            </div>
          ) : activeTab === "curl_entrypoints" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span>cURL Compétitions EntryPoints</span>
                </span>
                <button
                  onClick={() => handleCopy(curlEntryPoints)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copié !" : "Copier cURL"}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-indigo-300 overflow-x-auto whitespace-pre-wrap">
                {curlEntryPoints}
              </pre>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Affichage de {currentPayload.length} éléments en direct depuis l&apos;API.
                </span>
                <button
                  onClick={() => handleCopy(JSON.stringify(currentPayload, null, 2))}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copié !" : "Copier tout le JSON"}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-[480px]">
                {JSON.stringify(currentPayload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
