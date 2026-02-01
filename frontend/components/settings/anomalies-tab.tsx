'use client';

import { LogIn, LogOut, ArrowLeftRight } from 'lucide-react';

interface AnomaliesTabProps {
  formData: {
    // DOUBLE_IN
    doubleInDetectionWindow: number;
    orphanInThreshold: number;
    doublePunchToleranceMinutes: number;
    enableDoubleInPatternDetection: boolean;
    doubleInPatternAlertThreshold: number;
    // MISSING_IN
    allowMissingInForRemoteWork: boolean;
    allowMissingInForMissions: boolean;
    missingInReminderEnabled: boolean;
    missingInReminderDelay: number;
    missingInReminderMaxPerDay: number;
    enableMissingInPatternDetection: boolean;
    missingInPatternAlertThreshold: number;
    // MISSING_OUT
    missingOutDetectionTime: string;
    missingOutDetectionWindow: number;
    allowMissingOutForRemoteWork: boolean;
    allowMissingOutForMissions: boolean;
    missingOutReminderEnabled: boolean;
    missingOutReminderDelay: number;
    missingOutReminderBeforeClosing: number;
    enableMissingOutPatternDetection: boolean;
    missingOutPatternAlertThreshold: number;
    // WRONG TYPE
    enableWrongTypeDetection: boolean;
    wrongTypeAutoCorrect: boolean;
    wrongTypeDetectionMethod: string;
    wrongTypeShiftMarginMinutes: number;
    wrongTypeConfidenceThreshold: number;
    wrongTypeRequiresValidation: boolean;
  };
  setFormData: (data: any) => void;
}

export function AnomaliesTab({ formData, setFormData }: AnomaliesTabProps) {
  return (
    <div className="space-y-6">
      {/* DOUBLE_IN Detection */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[18px] font-semibold text-[#212529] flex items-center gap-2">
            <LogIn className="w-5 h-5 text-red-500" />
            Detection DOUBLE_IN
          </h2>
          <p className="text-[13px] text-[#6C757D] mt-1">
            Configuration de la detection des doubles pointages d'entree
          </p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Fenetre de detection (heures)
              </label>
              <input
                type="number"
                min="1"
                max="48"
                value={formData.doubleInDetectionWindow}
                onChange={(e) => setFormData({ ...formData, doubleInDetectionWindow: parseInt(e.target.value) || 24 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
              <p className="text-xs text-gray-500 mt-1">Periode pendant laquelle un second IN est considere comme DOUBLE_IN</p>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Seuil IN orphelin (heures)
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={formData.orphanInThreshold}
                onChange={(e) => setFormData({ ...formData, orphanInThreshold: parseInt(e.target.value) || 12 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
              <p className="text-xs text-gray-500 mt-1">Apres ce delai, un IN sans OUT est considere orphelin</p>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Tolerance double badgeage (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.doublePunchToleranceMinutes}
                onChange={(e) => setFormData({ ...formData, doublePunchToleranceMinutes: parseInt(e.target.value) || 2 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
              <p className="text-xs text-gray-500 mt-1">Ignorer les badgeages tres rapproches</p>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Seuil alerte patterns (sur 30 jours)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.doubleInPatternAlertThreshold}
                onChange={(e) => setFormData({ ...formData, doubleInPatternAlertThreshold: parseInt(e.target.value) || 3 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-[14px] font-semibold text-[#212529]">Detection de patterns suspects</div>
              <div className="text-[12px] text-[#6C757D] mt-0.5">Detecter les employes avec des DOUBLE_IN recurrents</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enableDoubleInPatternDetection}
                onChange={(e) => setFormData({ ...formData, enableDoubleInPatternDetection: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0052CC]"></div>
            </label>
          </div>
        </div>
      </div>

      {/* MISSING_IN Advanced */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[18px] font-semibold text-[#212529] flex items-center gap-2">
            <LogIn className="w-5 h-5 text-orange-500" />
            MISSING_IN - Parametres Avances
          </h2>
          <p className="text-[13px] text-[#6C757D] mt-1">
            Configuration avancee de la detection des pointages d'entree manquants
          </p>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-[15px] font-semibold text-[#212529]">Exceptions autorisees</h3>
            {[
              { key: 'allowMissingInForRemoteWork', label: 'Autoriser pour teletravail', desc: 'Ne pas generer d\'anomalie MISSING_IN pour les employes en teletravail' },
              { key: 'allowMissingInForMissions', label: 'Autoriser pour missions', desc: 'Ne pas generer d\'anomalie MISSING_IN pour les employes en mission externe' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-[14px] font-semibold text-[#212529]">{item.label}</div>
                  <div className="text-[12px] text-[#6C757D] mt-0.5">{item.desc}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData[item.key as keyof typeof formData] as boolean}
                    onChange={(e) => setFormData({ ...formData, [item.key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0052CC]"></div>
                </label>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-[15px] font-semibold text-[#212529] mb-4">Systeme de rappels</h3>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
              <div>
                <div className="text-[14px] font-semibold text-[#212529]">Activer les rappels MISSING_IN</div>
                <div className="text-[12px] text-[#6C757D] mt-0.5">Envoyer des rappels aux employes qui n'ont pas pointe</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.missingInReminderEnabled}
                  onChange={(e) => setFormData({ ...formData, missingInReminderEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0052CC]"></div>
              </label>
            </div>
            {formData.missingInReminderEnabled && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">Delai avant rappel (minutes)</label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={formData.missingInReminderDelay}
                    onChange={(e) => setFormData({ ...formData, missingInReminderDelay: parseInt(e.target.value) || 15 })}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">Rappels max par jour</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.missingInReminderMaxPerDay}
                    onChange={(e) => setFormData({ ...formData, missingInReminderMaxPerDay: parseInt(e.target.value) || 2 })}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-[15px] font-semibold text-[#212529] mb-4">Detection de patterns</h3>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
              <div>
                <div className="text-[14px] font-semibold text-[#212529]">Detection patterns d'oubli</div>
                <div className="text-[12px] text-[#6C757D] mt-0.5">Detecter les employes oubliant frequemment de pointer</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableMissingInPatternDetection}
                  onChange={(e) => setFormData({ ...formData, enableMissingInPatternDetection: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0052CC]"></div>
              </label>
            </div>
            {formData.enableMissingInPatternDetection && (
              <div>
                <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">Seuil d'alerte pattern (sur 30 jours)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.missingInPatternAlertThreshold}
                  onChange={(e) => setFormData({ ...formData, missingInPatternAlertThreshold: parseInt(e.target.value) || 3 })}
                  className="w-full max-w-xs px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MISSING_OUT Advanced */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[18px] font-semibold text-[#212529] flex items-center gap-2">
            <LogOut className="w-5 h-5 text-purple-500" />
            MISSING_OUT - Parametres Avances
          </h2>
          <p className="text-[13px] text-[#6C757D] mt-1">
            Configuration avancee de la detection des pointages de sortie manquants
          </p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">Heure detection batch</label>
              <input
                type="time"
                value={formData.missingOutDetectionTime}
                onChange={(e) => setFormData({ ...formData, missingOutDetectionTime: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
              <p className="text-xs text-gray-500 mt-1">Heure du job batch quotidien</p>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">Fenetre detection nuit (heures)</label>
              <input
                type="number"
                min="6"
                max="24"
                value={formData.missingOutDetectionWindow}
                onChange={(e) => setFormData({ ...formData, missingOutDetectionWindow: parseInt(e.target.value) || 12 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
              <p className="text-xs text-gray-500 mt-1">Pour les shifts de nuit traversant minuit</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-[15px] font-semibold text-[#212529] mb-4">Exceptions autorisees</h3>
            {[
              { key: 'allowMissingOutForRemoteWork', label: 'Autoriser pour teletravail', desc: 'Ne pas generer d\'anomalie MISSING_OUT pour les employes en teletravail' },
              { key: 'allowMissingOutForMissions', label: 'Autoriser pour missions', desc: 'Ne pas generer d\'anomalie MISSING_OUT pour les employes en mission externe' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
                <div>
                  <div className="text-[14px] font-semibold text-[#212529]">{item.label}</div>
                  <div className="text-[12px] text-[#6C757D] mt-0.5">{item.desc}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData[item.key as keyof typeof formData] as boolean}
                    onChange={(e) => setFormData({ ...formData, [item.key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0052CC]"></div>
                </label>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-[15px] font-semibold text-[#212529] mb-4">Systeme de rappels</h3>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
              <div>
                <div className="text-[14px] font-semibold text-[#212529]">Activer les rappels MISSING_OUT</div>
                <div className="text-[12px] text-[#6C757D] mt-0.5">Envoyer des rappels aux employes qui n'ont pas pointe leur sortie</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.missingOutReminderEnabled}
                  onChange={(e) => setFormData({ ...formData, missingOutReminderEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0052CC]"></div>
              </label>
            </div>
            {formData.missingOutReminderEnabled && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">Delai avant rappel (minutes)</label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={formData.missingOutReminderDelay}
                    onChange={(e) => setFormData({ ...formData, missingOutReminderDelay: parseInt(e.target.value) || 15 })}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">Rappel avant fermeture shift (min)</label>
                  <input
                    type="number"
                    min="10"
                    max="60"
                    value={formData.missingOutReminderBeforeClosing}
                    onChange={(e) => setFormData({ ...formData, missingOutReminderBeforeClosing: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-[15px] font-semibold text-[#212529] mb-4">Detection de patterns</h3>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
              <div>
                <div className="text-[14px] font-semibold text-[#212529]">Detection patterns d'oubli</div>
                <div className="text-[12px] text-[#6C757D] mt-0.5">Detecter les employes oubliant frequemment de pointer la sortie</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableMissingOutPatternDetection}
                  onChange={(e) => setFormData({ ...formData, enableMissingOutPatternDetection: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0052CC]"></div>
              </label>
            </div>
            {formData.enableMissingOutPatternDetection && (
              <div>
                <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">Seuil d'alerte pattern (sur 30 jours)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.missingOutPatternAlertThreshold}
                  onChange={(e) => setFormData({ ...formData, missingOutPatternAlertThreshold: parseInt(e.target.value) || 3 })}
                  className="w-full max-w-xs px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                />
              </div>
            )}
          </div>
        </div>
      </div>
      {/* WRONG TYPE Detection */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[18px] font-semibold text-[#212529] flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-amber-500" />
            Detection Erreur de Type (IN/OUT)
          </h2>
          <p className="text-[13px] text-[#6C757D] mt-1">
            Detecte quand un employe appuie sur IN au lieu de OUT (ou inversement) en comparant avec son planning
          </p>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div>
              <div className="text-[14px] font-semibold text-[#212529]">Activer la detection d'erreur de type</div>
              <div className="text-[12px] text-[#6C757D] mt-0.5">Analyser chaque pointage pour detecter les inversions IN/OUT probables</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enableWrongTypeDetection}
                onChange={(e) => setFormData({ ...formData, enableWrongTypeDetection: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {formData.enableWrongTypeDetection && (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                    Methode de detection
                  </label>
                  <select
                    value={formData.wrongTypeDetectionMethod}
                    onChange={(e) => setFormData({ ...formData, wrongTypeDetectionMethod: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  >
                    <option value="SHIFT_BASED">Basee sur le shift (recommande)</option>
                    <option value="CONTEXT_BASED">Basee sur le contexte</option>
                    <option value="COMBINED">Combinee (shift + contexte)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">SHIFT_BASED compare avec le planning, CONTEXT_BASED analyse la sequence des pointages</p>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                    Marge autour du shift (minutes)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="300"
                    value={formData.wrongTypeShiftMarginMinutes}
                    onChange={(e) => setFormData({ ...formData, wrongTypeShiftMarginMinutes: parseInt(e.target.value) || 120 })}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  />
                  <p className="text-xs text-gray-500 mt-1">Fenetre de temps autour du debut/fin du shift pour la detection</p>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                    Seuil de confiance (%)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={formData.wrongTypeConfidenceThreshold}
                    onChange={(e) => setFormData({ ...formData, wrongTypeConfidenceThreshold: parseInt(e.target.value) || 80 })}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  />
                  <p className="text-xs text-gray-500 mt-1">Niveau minimum de confiance pour signaler une erreur (80% recommande)</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 space-y-4">
                <h3 className="text-[15px] font-semibold text-[#212529]">Correction automatique</h3>
                {[
                  { key: 'wrongTypeAutoCorrect', label: 'Auto-correction du type', desc: 'Corriger automatiquement le type IN/OUT quand la confiance est suffisante' },
                  { key: 'wrongTypeRequiresValidation', label: 'Validation requise', desc: 'Meme en auto-correction, marquer le pointage pour validation manuelle' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-[14px] font-semibold text-[#212529]">{item.label}</div>
                      <div className="text-[12px] text-[#6C757D] mt-0.5">{item.desc}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData[item.key as keyof typeof formData] as boolean}
                        onChange={(e) => setFormData({ ...formData, [item.key]: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0052CC]"></div>
                    </label>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
