import React, { useState } from "react";
import { Key, CheckCircle2, AlertTriangle, RefreshCw, X, Copy, ExternalLink } from "lucide-react";
import { fetchEntryPoints, DEFAULT_BEARER_TOKEN } from "../services/sportyApi";

interface TokenSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentToken: string;
  onSaveToken: (newToken: string) => void;
}

export const TokenSettingsModal: React.FC<TokenSettingsModalProps> = ({
  isOpen,
  onClose,
  currentToken,
  onSaveToken,
}) => {
  const [tokenInput, setTokenInput] = useState(currentToken);
  const [testResult, setTestResult] = useState<{
    status: "idle" | "testing" | "success" | "error";
    message?: string;
    itemCount?: number;
  }>({ status: "idle" });

  if (!isOpen) return null;

  const handleTestToken = async () => {
    setTestResult({ status: "testing" });
    const cleanToken = tokenInput.trim().replace(/^Bearer\s+/i, "");

    const res = await fetchEntryPoints(cleanToken);

    if (res.status === 200) {
      setTestResult({
        status: "success",
        message: `Connexion réussie! ${res.data.length} compétitions autorisées détectées.`,
        itemCount: res.data.length,
      });
    } else {
      setTestResult({
        status: "error",
        message: `Erreur d'authentification (Code HTTP ${res.status}). Le jeton Bearer est expiré ou invalide.`,
      });
    }
  };

  const handleSave = () => {
    const cleanToken = tokenInput.trim().replace(/^Bearer\s+/i, "");
    onSaveToken(cleanToken);
    onClose();
  };

  const handleResetDefault = () => {
    setTokenInput(DEFAULT_BEARER_TOKEN);
    setTestResult({ status: "idle" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Paramètres du Jeton Bearer (Sporty / Bet261)</h2>
              <p className="text-xs text-slate-400">
                Modifier le jeton d&apos;authentification JWT pour les requêtes API en direct
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Information banner */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-emerald-400">Note:</span> Le jeton Bearer change à chaque connexion sur Sporty/Bet261. Vous pouvez coller un nouveau jeton à tout moment ci-dessous. Il sera sauvegardé dans votre navigateur.
          </div>

          {/* Token Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Jeton Authorization Bearer (JWT)
            </label>
            <textarea
              value={tokenInput}
              onChange={(e) => {
                setTokenInput(e.target.value);
                setTestResult({ status: "idle" });
              }}
              rows={5}
              placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-emerald-300 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none"
            />
          </div>

          {/* Test connection result banner */}
          {testResult.status !== "idle" && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                testResult.status === "testing"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : testResult.status === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              {testResult.status === "testing" ? (
                <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-amber-400" />
              ) : testResult.status === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span className="font-medium">
                {testResult.status === "testing"
                  ? "Vérification des accès API en cours..."
                  : testResult.message}
              </span>
            </div>
          )}

          {/* Action buttons bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button
              onClick={handleResetDefault}
              className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2"
            >
              Réinitialiser au jeton initial
            </button>

            <button
              onClick={handleTestToken}
              disabled={testResult.status === "testing" || !tokenInput.trim()}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testResult.status === "testing" ? "animate-spin" : ""}`} />
              <span>Tester le Jeton</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!tokenInput.trim()}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            Appliquer et Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
};
