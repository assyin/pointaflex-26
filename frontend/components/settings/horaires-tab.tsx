'use client';

import { Clock, Moon, Calculator, Zap, Bell, Fingerprint, Coffee, Power } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface HorairesTabProps {
  formData: {
    lateToleranceEntry: number;
    earlyToleranceExit: number;
    overtimeRounding: number;
    overtimeMinimumThreshold: number;
    dailyWorkingHours: number;
    temporaryMatriculeExpiryDays: number;
    workDaysPerWeek: number;
    maxWeeklyHours: number;
    breakDuration: number;
    overtimeRate: number;
    nightShiftRate: number;
    nightShiftStart: string;
    nightShiftEnd: string;
    // Nouveaux champs configurables
    overtimeMajorationEnabled: boolean;
    overtimeRateStandard: number;
    overtimeRateNight: number;
    overtimeRateHoliday: number;
    overtimeRateEmergency: number;
    overtimeAutoDetectType: boolean;
    overtimePendingNotificationTime: string;
    // Auto-approbation
    overtimeAutoApprove: boolean;
    overtimeAutoApproveMaxHours: number;
    // Détection IN/OUT automatique
    doublePunchToleranceMinutes: number;
    allowImplicitBreaks: boolean;
    minImplicitBreakMinutes: number;
    maxImplicitBreakMinutes: number;
    autoCloseOrphanSessions: boolean;
    autoCloseDefaultTime: string;
    autoCloseOvertimeBuffer: number;
    autoCloseCheckApprovedOvertime: boolean;
  };
  setFormData: (data: any) => void;
}

export function HorairesTab({ formData, setFormData }: HorairesTabProps) {
  return (
    <div className="space-y-6">
      {/* Tolerances */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[18px] font-semibold text-[#212529] flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#0052CC]" />
            Politique horaire & tolerances
          </h2>
          <p className="text-[13px] text-[#6C757D] mt-1">
            Regles de calcul des retards et heures supplementaires
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Tolerance retard a l'entree (minutes)
              </label>
              <input
                type="number"
                value={formData.lateToleranceEntry}
                onChange={(e) => setFormData({ ...formData, lateToleranceEntry: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Tolerance depart anticipe (minutes)
              </label>
              <input
                type="number"
                value={formData.earlyToleranceExit}
                onChange={(e) => setFormData({ ...formData, earlyToleranceExit: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Arrondi des heures sup (minutes)
              </label>
              <select
                value={formData.overtimeRounding}
                onChange={(e) => setFormData({ ...formData, overtimeRounding: parseInt(e.target.value) })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Seuil minimum heures sup (minutes)
              </label>
              <input
                type="number"
                min="0"
                max="120"
                step="15"
                value={formData.overtimeMinimumThreshold}
                onChange={(e) => setFormData({ ...formData, overtimeMinimumThreshold: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
              <p className="text-xs text-gray-500 mt-1">Seuil pour creation automatique d'Overtime</p>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Heures par jour de travail
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                max="24"
                value={formData.dailyWorkingHours}
                onChange={(e) => setFormData({ ...formData, dailyWorkingHours: parseFloat(e.target.value) || 7.33 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
              <p className="text-xs text-gray-500 mt-1">Defaut: 44h/6j = 7.33h</p>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Expiration matricule temporaire (jours)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={formData.temporaryMatriculeExpiryDays}
                onChange={(e) => setFormData({ ...formData, temporaryMatriculeExpiryDays: parseInt(e.target.value) || 8 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Politique horaire avancee */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[18px] font-semibold text-[#212529] flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-500" />
            Politique horaire avancee
          </h2>
          <p className="text-[13px] text-[#6C757D] mt-1">
            Configuration des regles de temps de travail hebdomadaire
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Jours travailles par semaine
              </label>
              <input
                type="number"
                min="1"
                max="7"
                value={formData.workDaysPerWeek}
                onChange={(e) => setFormData({ ...formData, workDaysPerWeek: parseInt(e.target.value) || 6 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Heures maximales hebdomadaires
              </label>
              <input
                type="number"
                min="20"
                max="60"
                value={formData.maxWeeklyHours}
                onChange={(e) => setFormData({ ...formData, maxWeeklyHours: parseInt(e.target.value) || 44 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Duree de pause (minutes)
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={formData.breakDuration}
                onChange={(e) => setFormData({ ...formData, breakDuration: parseInt(e.target.value) || 60 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Taux majoration heures sup
              </label>
              <input
                type="number"
                step="0.05"
                min="1"
                max="3"
                value={formData.overtimeRate}
                onChange={(e) => setFormData({ ...formData, overtimeRate: parseFloat(e.target.value) || 1.25 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
              <p className="text-xs text-gray-500 mt-1">Ex: 1.25 = +25%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Shift de nuit */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[18px] font-semibold text-[#212529] flex items-center gap-2">
            <Moon className="w-5 h-5 text-indigo-500" />
            Configuration Shift de Nuit
          </h2>
          <p className="text-[13px] text-[#6C757D] mt-1">
            Horaires et majorations pour le travail de nuit
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Heure debut nuit
              </label>
              <input
                type="time"
                value={formData.nightShiftStart}
                onChange={(e) => setFormData({ ...formData, nightShiftStart: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Heure fin nuit
              </label>
              <input
                type="time"
                value={formData.nightShiftEnd}
                onChange={(e) => setFormData({ ...formData, nightShiftEnd: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Taux majoration nuit (legacy)
              </label>
              <input
                type="number"
                step="0.05"
                min="1"
                max="3"
                value={formData.nightShiftRate}
                onChange={(e) => setFormData({ ...formData, nightShiftRate: parseFloat(e.target.value) || 1.5 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
              <p className="text-xs text-gray-500 mt-1">Ex: 1.5 = +50%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Détection IN/OUT automatique */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[18px] font-semibold text-[#212529] flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-purple-500" />
            Detection IN/OUT Automatique
          </h2>
          <p className="text-[13px] text-[#6C757D] mt-1">
            Configuration de la detection automatique des entrees/sorties depuis les terminaux
          </p>
        </div>
        <div className="p-6 space-y-6">
          {/* Anti-rebond */}
          <div>
            <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
              <span className="inline-flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                Tolerance anti-rebond (minutes)
              </span>
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.doublePunchToleranceMinutes}
              onChange={(e) => setFormData({ ...formData, doublePunchToleranceMinutes: parseInt(e.target.value) || 2 })}
              className="w-full max-w-xs px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tout pointage survenant moins de X minutes apres le precedent est ignore (evite les doubles badges)
            </p>
          </div>

          {/* Pauses implicites */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
              <div>
                <Label htmlFor="allowImplicitBreaks" className="text-[14px] font-medium text-[#212529]">
                  <span className="inline-flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-amber-500" />
                    Activer les pauses implicites
                  </span>
                </Label>
                <p className="text-[12px] text-[#6C757D] mt-0.5">
                  Un OUT suivi d'un IN dans un delai raisonnable est considere comme pause (pas d'anomalie)
                </p>
              </div>
              <Switch
                id="allowImplicitBreaks"
                checked={formData.allowImplicitBreaks}
                onCheckedChange={(checked) => setFormData({ ...formData, allowImplicitBreaks: checked })}
              />
            </div>

            <div className={`grid grid-cols-2 gap-6 ${!formData.allowImplicitBreaks ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                  Duree minimum de pause (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={formData.minImplicitBreakMinutes}
                  onChange={(e) => setFormData({ ...formData, minImplicitBreakMinutes: parseInt(e.target.value) || 30 })}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                />
                <p className="text-xs text-gray-500 mt-1">En dessous, c'est un double badge</p>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                  Duree maximum de pause (minutes)
                </label>
                <input
                  type="number"
                  min="30"
                  max="240"
                  value={formData.maxImplicitBreakMinutes}
                  onChange={(e) => setFormData({ ...formData, maxImplicitBreakMinutes: parseInt(e.target.value) || 120 })}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                />
                <p className="text-xs text-gray-500 mt-1">Au dela, c'est une absence partielle</p>
              </div>
            </div>
          </div>

          {/* Clôture automatique */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
              <div>
                <Label htmlFor="autoCloseOrphanSessions" className="text-[14px] font-medium text-[#212529]">
                  <span className="inline-flex items-center gap-2">
                    <Power className="w-4 h-4 text-red-500" />
                    Cloture automatique des sessions orphelines
                  </span>
                </Label>
                <p className="text-[12px] text-[#6C757D] mt-0.5">
                  Ferme automatiquement les sessions IN sans OUT a la fin de la journee (badge oublie)
                </p>
              </div>
              <Switch
                id="autoCloseOrphanSessions"
                checked={formData.autoCloseOrphanSessions}
                onCheckedChange={(checked) => setFormData({ ...formData, autoCloseOrphanSessions: checked })}
              />
            </div>

            <div className={`space-y-6 ${!formData.autoCloseOrphanSessions ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                  Heure de cloture par defaut (si pas de shift)
                </label>
                <input
                  type="time"
                  value={formData.autoCloseDefaultTime}
                  onChange={(e) => setFormData({ ...formData, autoCloseDefaultTime: e.target.value })}
                  className="w-full max-w-xs px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Utilise si l'employe n'a pas de shift defini (par defaut: 23:59)
                </p>
              </div>

              {/* Protection heures supplémentaires */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="text-[14px] font-semibold text-amber-800 mb-3">
                  Protection des Heures Supplementaires
                </h4>
                <p className="text-[12px] text-amber-700 mb-4">
                  Ces options evitent de perdre des heures supplementaires lors de la cloture automatique.
                </p>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg mb-4">
                  <div>
                    <Label htmlFor="autoCloseCheckApprovedOvertime" className="text-[13px] font-medium text-[#212529]">
                      Verifier les heures sup approuvees
                    </Label>
                    <p className="text-[11px] text-[#6C757D] mt-0.5">
                      Si overtime APPROVED existe, utilise l'heure de fin + heures sup
                    </p>
                  </div>
                  <Switch
                    id="autoCloseCheckApprovedOvertime"
                    checked={formData.autoCloseCheckApprovedOvertime}
                    onCheckedChange={(checked) => setFormData({ ...formData, autoCloseCheckApprovedOvertime: checked })}
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                    Buffer heures sup (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="480"
                    step="15"
                    value={formData.autoCloseOvertimeBuffer}
                    onChange={(e) => setFormData({ ...formData, autoCloseOvertimeBuffer: parseInt(e.target.value) || 0 })}
                    className="w-full max-w-xs px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minutes a ajouter apres fin de shift (0 = desactive). Ex: 120 min = 2h de marge pour heures sup.
                  </p>
                </div>
              </div>

              {/* Message d'info sur AUTO_CLOSED_CHECK_OVERTIME */}
              {formData.autoCloseCheckApprovedOvertime && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-[12px] text-blue-700">
                    <strong>Info:</strong> Si des heures sup sont en attente (PENDING), le systeme marquera la session comme{' '}
                    <span className="font-mono bg-blue-100 px-1 rounded">AUTO_CLOSED_CHECK_OVERTIME</span> pour verification RH.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-[13px] text-purple-700">
              <strong>Note:</strong> Ces parametres s'appliquent a tous les terminaux de pointage (ZKTeco, etc.).
              La detection IN/OUT utilise l'alternance des pointages et les regles configurees ici.
            </p>
          </div>
        </div>
      </div>

      {/* Configuration des taux de majoration */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[18px] font-semibold text-[#212529] flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-500" />
            Taux de Majoration Heures Supplementaires
          </h2>
          <p className="text-[13px] text-[#6C757D] mt-1">
            Configuration des taux de majoration par type d'heures supplementaires
          </p>
        </div>
        <div className="p-6 space-y-6">
          {/* Toggles */}
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="overtimeMajorationEnabled" className="text-[14px] font-medium text-[#212529]">
                  Activer les majorations
                </Label>
                <p className="text-[12px] text-[#6C757D] mt-0.5">
                  Si desactive, tous les taux = 1.0 (pas de majoration)
                </p>
              </div>
              <Switch
                id="overtimeMajorationEnabled"
                checked={formData.overtimeMajorationEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, overtimeMajorationEnabled: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="overtimeAutoDetectType" className="text-[14px] font-medium text-[#212529]">
                  Detection automatique du type
                </Label>
                <p className="text-[12px] text-[#6C757D] mt-0.5">
                  NIGHT si shift nuit, HOLIDAY si jour ferie
                </p>
              </div>
              <Switch
                id="overtimeAutoDetectType"
                checked={formData.overtimeAutoDetectType}
                onCheckedChange={(checked) => setFormData({ ...formData, overtimeAutoDetectType: checked })}
              />
            </div>
          </div>

          {/* Taux par type */}
          <div className={`grid grid-cols-2 gap-6 ${!formData.overtimeMajorationEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  Taux STANDARD
                </span>
              </label>
              <input
                type="number"
                step="0.05"
                min="1"
                max="3"
                value={formData.overtimeRateStandard}
                onChange={(e) => setFormData({ ...formData, overtimeRateStandard: parseFloat(e.target.value) || 1.25 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
              <p className="text-xs text-gray-500 mt-1">Heures supplementaires standard (1.0 = pas de majoration, 1.25 = +25%)</p>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                  Taux NUIT
                </span>
              </label>
              <input
                type="number"
                step="0.05"
                min="1"
                max="3"
                value={formData.overtimeRateNight}
                onChange={(e) => setFormData({ ...formData, overtimeRateNight: parseFloat(e.target.value) || 1.50 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
              <p className="text-xs text-gray-500 mt-1">Heures de nuit (1.5 = +50%)</p>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  Taux JOUR FERIE
                </span>
              </label>
              <input
                type="number"
                step="0.05"
                min="1"
                max="3"
                value={formData.overtimeRateHoliday}
                onChange={(e) => setFormData({ ...formData, overtimeRateHoliday: parseFloat(e.target.value) || 2.00 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
              <p className="text-xs text-gray-500 mt-1">Jours feries (2.0 = +100%)</p>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                <span className="inline-flex items-center gap-2">
                  <Zap className="w-3 h-3 text-amber-500" />
                  Taux URGENCE/ASTREINTE
                </span>
              </label>
              <input
                type="number"
                step="0.05"
                min="1"
                max="3"
                value={formData.overtimeRateEmergency}
                onChange={(e) => setFormData({ ...formData, overtimeRateEmergency: parseFloat(e.target.value) || 1.30 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
              <p className="text-xs text-gray-500 mt-1">Urgences et astreintes (1.3 = +30%)</p>
            </div>
          </div>

          {/* Info message si majorations desactivees */}
          {!formData.overtimeMajorationEnabled && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-[13px] text-amber-700">
                <strong>Majorations desactivees:</strong> Toutes les heures supplementaires seront comptees avec un taux de 1.0 (1h supp = 1h comptee).
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Auto-approbation Heures Supplémentaires */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[18px] font-semibold text-[#212529] flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-500" />
            Auto-approbation Heures Supplementaires
          </h2>
          <p className="text-[13px] text-[#6C757D] mt-1">
            Approuver automatiquement les heures supplementaires sous un certain seuil
          </p>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="overtimeAutoApprove" className="text-[14px] font-medium text-[#212529]">
                Activer l'auto-approbation
              </Label>
              <p className="text-[12px] text-[#6C757D] mt-0.5">
                Les heures sup detectees automatiquement seront approuvees sans intervention manuelle
              </p>
            </div>
            <Switch
              id="overtimeAutoApprove"
              checked={formData.overtimeAutoApprove}
              onCheckedChange={(checked) => setFormData({ ...formData, overtimeAutoApprove: checked })}
            />
          </div>

          <div className={`${!formData.overtimeAutoApprove ? 'opacity-50 pointer-events-none' : ''}`}>
            <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
              Seuil maximum d'heures (auto-approbation)
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="12"
              value={formData.overtimeAutoApproveMaxHours}
              onChange={(e) => setFormData({ ...formData, overtimeAutoApproveMaxHours: parseFloat(e.target.value) || 4 })}
              className="w-full max-w-xs px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Les heures sup depassant ce seuil resteront en attente d'approbation manuelle (defaut: 4h)
            </p>
          </div>

          {formData.overtimeAutoApprove && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-[13px] text-green-700">
                <strong>Auto-approbation active:</strong> Les heures supplementaires de {formData.overtimeAutoApproveMaxHours || 4}h ou moins seront automatiquement approuvees lors de la detection quotidienne.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Notifications Heures Supplémentaires */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[18px] font-semibold text-[#212529] flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            Notifications Heures Supplementaires
          </h2>
          <p className="text-[13px] text-[#6C757D] mt-1">
            Configuration des notifications email pour les managers
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Heure d'envoi des notifications
              </label>
              <input
                type="time"
                value={formData.overtimePendingNotificationTime}
                onChange={(e) => setFormData({ ...formData, overtimePendingNotificationTime: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Heure a laquelle les managers recoivent le recapitulatif des heures sup en attente
              </p>
            </div>
            <div className="flex items-center">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-[13px] text-blue-700">
                  <strong>Note:</strong> Les notifications doivent etre activees dans la section{' '}
                  <span className="font-mono bg-blue-100 px-1 rounded">/email-admin</span> pour fonctionner.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
