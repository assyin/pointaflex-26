'use client';

import { Briefcase, RotateCcw } from 'lucide-react';

interface CongesTabProps {
  formData: {
    twoLevelWorkflow: boolean;
    anticipatedLeave: boolean;
    leaveIncludeSaturday: boolean;
    annualLeaveDays: number;
    leaveApprovalLevels: number;
    recoveryExpiryDays: number;
    recoveryConversionRate: number;
  };
  setFormData: (data: any) => void;
}

export function CongesTab({ formData, setFormData }: CongesTabProps) {
  return (
    <div className="space-y-6">
      {/* Regles de conges */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[18px] font-semibold text-[#212529] flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-green-500" />
            Regles de Conges
          </h2>
          <p className="text-[13px] text-[#6C757D] mt-1">
            Configuration des regles de gestion des conges
          </p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Jours de conge annuels
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={formData.annualLeaveDays}
                onChange={(e) => setFormData({ ...formData, annualLeaveDays: parseInt(e.target.value) || 18 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
              <p className="text-xs text-gray-500 mt-1">Droit legal marocain: 18 jours minimum</p>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Niveaux d'approbation
              </label>
              <select
                value={formData.leaveApprovalLevels}
                onChange={(e) => setFormData({ ...formData, leaveApprovalLevels: parseInt(e.target.value) })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              >
                <option value="1">1 niveau (Manager direct)</option>
                <option value="2">2 niveaux (Manager + RH)</option>
                <option value="3">3 niveaux (Manager + RH + Direction)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-[14px] font-semibold text-[#212529]">
                  Workflow a 2 niveaux
                </div>
                <div className="text-[12px] text-[#6C757D] mt-0.5">
                  Validation par manager puis service RH
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.twoLevelWorkflow}
                  onChange={(e) => setFormData({ ...formData, twoLevelWorkflow: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0052CC]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-[14px] font-semibold text-[#212529]">
                  Autoriser la prise anticipee de conges
                </div>
                <div className="text-[12px] text-[#6C757D] mt-0.5">
                  Permet un solde negatif
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.anticipatedLeave}
                  onChange={(e) => setFormData({ ...formData, anticipatedLeave: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0052CC]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-[14px] font-semibold text-[#212529]">
                  Inclure le samedi dans le calcul des conges
                </div>
                <div className="text-[12px] text-[#6C757D] mt-0.5">
                  Compte le samedi comme jour de conge meme si ce n'est pas un jour ouvrable
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.leaveIncludeSaturday}
                  onChange={(e) => setFormData({ ...formData, leaveIncludeSaturday: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0052CC]"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Recuperation */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[18px] font-semibold text-[#212529] flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-blue-500" />
            Recuperation
          </h2>
          <p className="text-[13px] text-[#6C757D] mt-1">
            Configuration de la conversion heures sup en recuperation
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Taux de conversion heures sup → recuperation
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="2"
                value={formData.recoveryConversionRate}
                onChange={(e) => setFormData({ ...formData, recoveryConversionRate: parseFloat(e.target.value) || 1.0 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
              <p className="text-xs text-gray-500 mt-1">
                1.0 = 1h sup = 1h recup, 1.5 = 1h sup = 1.5h recup
              </p>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#6C757D] mb-1.5">
                Delai d'expiration recuperation (jours)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={formData.recoveryExpiryDays}
                onChange={(e) => setFormData({ ...formData, recoveryExpiryDays: parseInt(e.target.value) || 90 })}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Nombre de jours avant expiration de la recuperation
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
