import React, { useState } from "react";
import { Lock, Unlock, Eye, EyeOff, Key, ShieldCheck, AlertCircle, Sparkles } from "lucide-react";

interface PasswordGateModalProps {
  onUnlock: () => void;
}

export const PasswordGateModal: React.FC<PasswordGateModalProps> = ({ onUnlock }) => {
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const trimmed = passwordInput.trim();
    if (!trimmed) {
      setErrorMessage("Veuillez entrer le mot de passe.");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      // Validate password "Naty" (case-insensitive or exact)
      if (trimmed === "Naty" || trimmed.toLowerCase() === "naty") {
        localStorage.setItem("SPORTY_SITE_AUTHENTICATED", "true");
        onUnlock();
      } else {
        setErrorMessage("Mot de passe incorrect. Astuce : le mot de passe est 'Naty'.");
        setIsSubmitting(false);
      }
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/30 space-y-6">
        {/* Glow accent */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none" />

        <div className="text-center space-y-3 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 mb-1 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <span>BET261 ARCHIVE PRO</span>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </h2>
            <p className="text-xs text-slate-400">
              Accès protégé — Veuillez saisir le mot de passe pour accéder à la plateforme d'analyse
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-2xl flex items-center gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Mot de passe d'accès</span>
              <span className="text-[10px] text-emerald-400 font-mono">Code : Naty</span>
            </label>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Key className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="Entrez le mot de passe..."
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 rounded-2xl pl-10 pr-12 py-3 text-sm font-mono text-white placeholder-slate-600 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                title={showPassword ? "Masquer" : "Afficher"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Déverrouillage...</span>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Déverrouiller l'accès</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Sécurité Bet261
          </span>
          <span>Saison & Minutes Extraction Ready</span>
        </div>
      </div>
    </div>
  );
};
