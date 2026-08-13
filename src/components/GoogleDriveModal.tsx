import React, { useState, useEffect } from "react";
import {
  X,
  CloudUpload,
  CloudDownload,
  Folder,
  ExternalLink,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileCode,
  FileSpreadsheet,
  HardDrive,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { User } from "firebase/auth";
import { initAuth, googleSignIn, logout, getAccessToken } from "../services/auth";
import {
  listDriveFiles,
  uploadDriveFile,
  downloadDriveFile,
  deleteDriveFile,
  DriveFileItem,
  extractFolderId,
} from "../services/googleDrive";
import { ExtractedMatchRecord } from "../types";

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  extractedDatabase: ExtractedMatchRecord[];
  onImportRecords: (records: ExtractedMatchRecord[], sourceFileName: string) => void;
  addLog: (type: "INFO" | "SUCCESS" | "WARN" | "MATRIX", message: string) => void;
  driveFolderUrl: string;
  setDriveFolderUrl: (url: string) => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  extractedDatabase,
  onImportRecords,
  addLog,
  driveFolderUrl,
  setDriveFolderUrl,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        setAuthError(null);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch drive files when authenticated and modal is open
  useEffect(() => {
    if (isOpen && accessToken) {
      handleRefreshFiles();
    }
  }, [isOpen, accessToken, driveFolderUrl]);

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
        addLog("SUCCESS", `[GOOGLE_DRIVE] Connexion réussie pour ${res.user.email}`);
        setStatusMessage({ type: "success", text: `Connecté en tant que ${res.user.email}` });
      }
    } catch (err: any) {
      const msg = err?.message || "Échec de la connexion à Google Drive";
      setAuthError(msg);
      addLog("WARN", `[GOOGLE_DRIVE] ${msg}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setCurrentUser(null);
    setAccessToken(null);
    setFiles([]);
    addLog("INFO", "[GOOGLE_DRIVE] Déconnexion Google effectuée.");
    setStatusMessage({ type: "info", text: "Déconnecté de Google Drive." });
  };

  const handleRefreshFiles = async () => {
    const token = accessToken || getAccessToken();
    if (!token) return;

    setIsLoadingFiles(true);
    setStatusMessage(null);
    try {
      const driveFiles = await listDriveFiles(driveFolderUrl, token);
      setFiles(driveFiles);
      addLog("INFO", `[GOOGLE_DRIVE] ${driveFiles.length} fichiers trouvés dans l'emplacement Drive.`);
    } catch (err: any) {
      const msg = err?.message || "Erreur lors du chargement des fichiers Drive.";
      setStatusMessage({ type: "error", text: msg });
      addLog("WARN", `[GOOGLE_DRIVE] ${msg}`);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleUploadDatabase = async (format: "json" | "csv") => {
    const token = accessToken || getAccessToken();
    if (!token) {
      setStatusMessage({ type: "error", text: "Veuillez vous connecter à Google Drive au préalable." });
      return;
    }

    if (extractedDatabase.length === 0) {
      setStatusMessage({ type: "error", text: "Aucune donnée en BDD à exporter. Effectuez d'abord une extraction." });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      let fileName = "";
      let content = "";
      let mimeType = "";

      if (format === "json") {
        fileName = `sporty_archive_export_${dateStr}.json`;
        mimeType = "application/json";
        const payload = {
          exportedAt: new Date().toISOString(),
          totalRecords: extractedDatabase.length,
          sourceApp: "Sporty Virtual Archive Engine",
          userEmail: currentUser?.email || "anonymous",
          records: extractedDatabase,
        };
        content = JSON.stringify(payload, null, 2);
      } else {
        fileName = `sporty_archive_export_${dateStr}.csv`;
        mimeType = "text/csv";
        const headers = ["ID Match", "Saison", "Date", "Match", "Compétition", "Équipe D domicile", "Équipe E extérieur", "Résultat H", "Résultat A", "Score final", "Cote H", "Cote D", "Cote A"];
        const rows = extractedDatabase.map((m) => [
          m.id,
          m.season,
          m.date,
          `"${m.match.replace(/"/g, '""')}"`,
          `"${m.competition.replace(/"/g, '""')}"`,
          `"${m.homeTeam.replace(/"/g, '""')}"`,
          `"${m.awayTeam.replace(/"/g, '""')}"`,
          m.homeScore,
          m.awayScore,
          `"${m.finalScore}"`,
          m.oddsHome,
          m.oddsDraw,
          m.oddsAway,
        ]);
        content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      }

      const uploaded = await uploadDriveFile(fileName, content, mimeType, driveFolderUrl, token);
      addLog(
        "SUCCESS",
        `[GOOGLE_DRIVE] 📁 Fichier "${uploaded.name}" envoyé avec succès dans le dossier Drive ! (${extractedDatabase.length} matchs)`
      );
      setStatusMessage({
        type: "success",
        text: `Fichier "${uploaded.name}" enregistré sur Google Drive (${extractedDatabase.length} enregistrements).`,
      });

      // Refresh list
      await handleRefreshFiles();
    } catch (err: any) {
      const msg = err?.message || "Échec de l'envoi sur Google Drive.";
      setStatusMessage({ type: "error", text: msg });
      addLog("WARN", `[GOOGLE_DRIVE] ${msg}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImportFile = async (file: DriveFileItem) => {
    const token = accessToken || getAccessToken();
    if (!token) return;

    try {
      addLog("INFO", `[GOOGLE_DRIVE] 📥 Chargement du fichier "${file.name}" depuis Drive...`);
      const fileText = await downloadDriveFile(file.id, token);

      let importedRecords: ExtractedMatchRecord[] = [];
      if (file.name.endsWith(".json") || file.mimeType.includes("json")) {
        const parsed = JSON.parse(fileText);
        let rawList: any[] = [];
        if (Array.isArray(parsed)) {
          rawList = parsed;
        } else if (parsed && Array.isArray(parsed.records)) {
          rawList = parsed.records;
        }

        importedRecords = rawList.map((item: any, idx: number) => {
          const rawS = item.seasonNumber || item.seasonId || item.season || item.rawMatch?.seasonNumber || item.rawMatch?.seasonId || 1;
          const sNum = typeof rawS === "number" ? rawS : (parseInt(String(rawS).replace(/\D/g, ""), 10) || 1);
          const sId = item.seasonId || sNum;
          return {
            id: typeof item.id === "number" ? item.id : Date.now() + idx,
            matchName: item.matchName || item.match || `${item.homeTeamName || item.homeTeam || "Équipe A"} vs ${item.awayTeamName || item.awayTeam || "Équipe B"}`,
            homeTeamName: item.homeTeamName || item.homeTeam || "Équipe A",
            awayTeamName: item.awayTeamName || item.awayTeam || "Équipe B",
            homeRank: item.homeRank || 1,
            awayRank: item.awayRank || 2,
            homePoints: item.homePoints || 0,
            awayPoints: item.awayPoints || 0,
            competitionId: item.competitionId || 100,
            competitionName: item.competitionName || item.competition || "Ligue Virtuelle",
            roundNumber: item.roundNumber || item.round || 1,
            seasonNumber: sNum,
            seasonId: sId,
            seasonName: item.seasonName || `Saison ${sNum}`,
            status: item.status === "Ended" || item.status === "Undisputed" || item.status === "Terminé" ? "Finished" : (item.status || "Finished"),
            expectedStart: item.expectedStart || item.date || new Date().toISOString(),
            score: item.score || item.finalScore || `${item.homeScore || 0}-${item.awayScore || 0}`,
            halfTimeScore: item.halfTimeScore || "0-0",
            goalsCount: item.goalsCount || 0,
            goalMinutes: item.goalMinutes || "",
            goalsDetail: item.goalsDetail || [],
            homeOdds: item.homeOdds || item.oddsHome || 2.1,
            drawOdds: item.drawOdds || item.oddsDraw || 3.2,
            awayOdds: item.awayOdds || item.oddsAway || 3.4,
            doubleChanceOdds: item.doubleChanceOdds || { dc1X: 1.3, dc12: 1.25, dcX2: 1.6 },
            overUnderOdds: item.overUnderOdds || { over25: 1.85, under25: 1.95 },
            bothTeamsScoreOdds: item.bothTeamsScoreOdds || { yes: 1.75, no: 2.05 },
            allOddsSummary: item.allOddsSummary || "1: 2.10 | X: 3.20 | 2: 3.40",
            headToHeadHistory: item.headToHeadHistory || [],
            extractedAt: item.extractedAt || new Date().toISOString(),
            source: "Imported JSON",
          };
        });
      } else if (file.name.endsWith(".csv") || file.mimeType.includes("csv")) {
        // Parse CSV lines
        const lines = fileText.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length > 1) {
          const dataRows = lines.slice(1);
          importedRecords = dataRows.map((line, idx) => {
            const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
            const homeT = cols[5] || cols[3]?.split(" vs ")[0] || "Équipe A";
            const awayT = cols[6] || cols[3]?.split(" vs ")[1] || "Équipe B";
            const hOdds = parseFloat(cols[10] || "2.10");
            const dOdds = parseFloat(cols[11] || "3.20");
            const aOdds = parseFloat(cols[12] || "3.40");

            return {
              id: parseInt(cols[0], 10) || Date.now() + idx,
              matchName: cols[3] || `${homeT} vs ${awayT}`,
              homeTeamName: homeT,
              awayTeamName: awayT,
              homeRank: 1,
              awayRank: 2,
              homePoints: 0,
              awayPoints: 0,
              competitionId: 100,
              competitionName: cols[4] || "Ligue Virtuelle",
              roundNumber: 1,
              status: "Finished",
              expectedStart: cols[2] || new Date().toISOString(),
              score: cols[9] || `${cols[7] || 0}-${cols[8] || 0}`,
              halfTimeScore: "0-0",
              goalsCount: (parseInt(cols[7] || "0", 10) || 0) + (parseInt(cols[8] || "0", 10) || 0),
              goalMinutes: "",
              goalsDetail: [],
              homeOdds: isNaN(hOdds) ? 2.1 : hOdds,
              drawOdds: isNaN(dOdds) ? 3.2 : dOdds,
              awayOdds: isNaN(aOdds) ? 3.4 : aOdds,
              doubleChanceOdds: { dc1X: 1.3, dc12: 1.25, dcX2: 1.6 },
              overUnderOdds: { over25: 1.85, under25: 1.95 },
              bothTeamsScoreOdds: { yes: 1.75, no: 2.05 },
              allOddsSummary: `1: ${hOdds} | X: ${dOdds} | 2: ${aOdds}`,
              headToHeadHistory: [],
              extractedAt: new Date().toISOString(),
              source: "Imported JSON",
            };
          });
        }
      }

      if (importedRecords.length > 0) {
        onImportRecords(importedRecords, file.name);
        setStatusMessage({
          type: "success",
          text: `${importedRecords.length} enregistrements importés depuis "${file.name}".`,
        });
        addLog("SUCCESS", `[GOOGLE_DRIVE] ${importedRecords.length} matchs importés avec succès dans la BDD.`);
      } else {
        setStatusMessage({
          type: "error",
          text: `Aucune donnée valide n'a pu être extraite du fichier "${file.name}".`,
        });
      }
    } catch (err: any) {
      const msg = err?.message || "Erreur lors de l'importation du fichier.";
      setStatusMessage({ type: "error", text: msg });
      addLog("WARN", `[GOOGLE_DRIVE] ${msg}`);
    }
  };

  const handleDeleteFileConfirm = async (file: DriveFileItem) => {
    const token = accessToken || getAccessToken();
    if (!token) return;

    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer le fichier "${file.name}" de votre Google Drive ? Cette action est irréversible.`
    );
    if (!confirmed) return;

    try {
      await deleteDriveFile(file.id, token);
      addLog("SUCCESS", `[GOOGLE_DRIVE] 🗑️ Fichier "${file.name}" supprimé de Google Drive.`);
      setStatusMessage({ type: "success", text: `Fichier "${file.name}" supprimé.` });
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err: any) {
      const msg = err?.message || "Erreur lors de la suppression du fichier.";
      setStatusMessage({ type: "error", text: msg });
      addLog("WARN", `[GOOGLE_DRIVE] ${msg}`);
    }
  };

  if (!isOpen) return null;

  const folderId = extractFolderId(driveFolderUrl);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-3xl w-full space-y-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                Google Drive Cloud Storage
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                  Intégration Directe
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Sauvegardez, consultez et synchronisez votre base de données en direct avec votre Google Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Section */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700 overflow-hidden shrink-0">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                {currentUser ? (
                  <>
                    <span>{currentUser.displayName || currentUser.email}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </>
                ) : (
                  <span className="text-slate-400">Non connecté à Google Drive</span>
                )}
              </div>
              <div className="text-[11px] text-slate-500">
                {currentUser?.email || "Connectez-vous pour accéder au stockage en nuage"}
              </div>
            </div>
          </div>

          <div>
            {!currentUser ? (
              <button
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="gsi-material-button text-xs font-bold px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isAuthenticating ? "Connexion..." : "Se connecter avec Google"}</span>
              </button>
            ) : (
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Déconnexion</span>
              </button>
            )}
          </div>
        </div>

        {authError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              statusMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : statusMessage.type === "error"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-blue-500/10 border-blue-500/30 text-blue-300"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : statusMessage.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Drive Folder Location Field */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-amber-400" />
              <span>Emplacement / Lien du Dossier Google Drive :</span>
            </span>
            <a
              href={driveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Ouvrir dans Google Drive</span>
            </a>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={driveFolderUrl}
              onChange={(e) => {
                setDriveFolderUrl(e.target.value);
                localStorage.setItem("SPORTY_DRIVE_FOLDER_URL", e.target.value);
              }}
              placeholder="Ex: https://drive.google.com/drive/folders/1TPg14mpTyGvRSpHM2_VsFegSnk6Yu5YA?usp=sharing"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:border-blue-500"
            />
            {currentUser && (
              <button
                onClick={handleRefreshFiles}
                disabled={isLoadingFiles}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Actualiser la liste des fichiers"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? "animate-spin" : ""}`} />
                <span>Actualiser</span>
              </button>
            )}
          </div>
          {folderId && (
            <div className="text-[11px] text-slate-500 font-mono">
              Folder ID actif : <span className="text-cyan-400 font-bold">{folderId}</span>
            </div>
          )}
        </div>

        {/* Main Actions: Export BDD to Google Drive */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
              <CloudUpload className="w-4 h-4 text-emerald-400" />
              <span>Exporter la Base de Données vers Google Drive ({extractedDatabase.length} matchs)</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleUploadDatabase("json")}
              disabled={isUploading || !currentUser}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <FileCode className="w-4 h-4 text-cyan-200" />
              <span>{isUploading ? "Envoi en cours..." : "Sauvegarder en JSON sur Drive"}</span>
            </button>

            <button
              onClick={() => handleUploadDatabase("csv")}
              disabled={isUploading || !currentUser}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>{isUploading ? "Envoi en cours..." : "Sauvegarder en CSV sur Drive"}</span>
            </button>
          </div>
        </div>

        {/* Files Explorer Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
              <CloudDownload className="w-4 h-4 text-cyan-400" />
              <span>Fichiers disponibles dans le dossier Google Drive ({files.length})</span>
            </h4>
          </div>

          {!currentUser ? (
            <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800/80 space-y-3">
              <HardDrive className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">
                Connectez-vous avec votre compte Google pour consulter les fichiers sauvegardés sur Drive.
              </p>
              <button
                onClick={handleSignIn}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Se connecter avec Google
              </button>
            </div>
          ) : isLoadingFiles ? (
            <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800/80 space-y-2">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Chargement des fichiers du dossier Google Drive...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800/80 space-y-2">
              <Folder className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">
                Aucun fichier trouvé dans ce dossier Drive. Exportez vos premières données ci-dessus !
              </p>
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="p-3 bg-slate-950 hover:bg-slate-800/60 rounded-xl border border-slate-800 flex items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 shrink-0">
                      {file.name.endsWith(".csv") ? (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <FileCode className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate" title={file.name}>
                        {file.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {file.modifiedTime
                          ? new Date(file.modifiedTime).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Date inconnue"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleImportFile(file)}
                      className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="Importer les données dans l'application"
                    >
                      <CloudDownload className="w-3.5 h-3.5" />
                      <span>Importer</span>
                    </button>

                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                        title="Voir sur Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    <button
                      onClick={() => handleDeleteFileConfirm(file)}
                      className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg transition-all cursor-pointer"
                      title="Supprimer du Drive"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-2 flex items-center justify-end border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
