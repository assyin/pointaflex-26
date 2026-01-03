'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useEmailConfig, useUpsertEmailConfig, useTestSmtpConnection, useSendTestEmail } from '@/lib/hooks/useEmailAdmin';
import { useTenantSettings, useUpdateTenantSettings } from '@/lib/hooks/useTenantSettings';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, Send, TestTube, Bell } from 'lucide-react';
import { toast } from 'sonner';
import type { EmailConfigInput, TestSmtpInput, SendTestEmailInput } from '@/types/email-admin';
import type { UpdateTenantSettingsDto } from '@/lib/api/tenants';

export function EmailConfigTab() {
  const { data: config, isLoading, error } = useEmailConfig();
  const upsertConfig = useUpsertEmailConfig();
  const testConnection = useTestSmtpConnection();
  const sendTest = useSendTestEmail();

  // TenantSettings for MISSING_IN/OUT config
  const { user } = useAuth();
  const { data: tenantSettings, isLoading: settingsLoading } = useTenantSettings(user?.tenantId || '');
  const updateSettings = useUpdateTenantSettings();

  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState({ to: '', subject: 'Test Email - PointaFlex' });
  const [testingConnection, setTestingConnection] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    missingInDetectionWindowMinutes: 30,
    missingInNotificationFrequencyMinutes: 15,
    missingOutDetectionWindowMinutes: 120,
    missingOutNotificationFrequencyMinutes: 15,
    // Nouveaux paramètres pour LATE, ABSENCE, ABSENCE_PARTIAL
    lateNotificationFrequencyMinutes: 15,
    lateNotificationThresholdMinutes: 15,
    absenceNotificationFrequencyMinutes: 60,
    absenceDetectionBufferMinutes: 60,
    absencePartialNotificationFrequencyMinutes: 30,
  });

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<EmailConfigInput>({
    defaultValues: {
      enabled: false,
      provider: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      username: '',
      password: '',
      fromName: 'PointaFlex',
      fromEmail: '',
      notifyMissingIn: true,
      notifyMissingOut: true,
      notifyLate: true,
      notifyAbsence: true,
      notifyAbsencePartial: true,
      notifyAbsenceTechnical: true,
    },
  });

  const enabled = watch('enabled');

  useEffect(() => {
    if (config) {
      reset({
        enabled: config.enabled,
        provider: config.provider || 'gmail',
        host: config.host || 'smtp.gmail.com',
        port: config.port || 587,
        secure: config.secure || false,
        username: config.username || '',
        password: config.password === '********' ? '********' : (config.password || ''),
        fromName: config.fromName || 'PointaFlex',
        fromEmail: config.fromEmail || '',
        notifyMissingIn: config.notifyMissingIn ?? true,
        notifyMissingOut: config.notifyMissingOut ?? true,
        notifyLate: config.notifyLate ?? true,
        notifyAbsence: config.notifyAbsence ?? true,
        notifyAbsencePartial: config.notifyAbsencePartial ?? true,
        notifyAbsenceTechnical: config.notifyAbsenceTechnical ?? true,
      });
    }
  }, [config, reset]);

  useEffect(() => {
    if (tenantSettings) {
      setNotificationSettings({
        missingInDetectionWindowMinutes: tenantSettings.missingInDetectionWindowMinutes || 30,
        missingInNotificationFrequencyMinutes: tenantSettings.missingInNotificationFrequencyMinutes || 15,
        missingOutDetectionWindowMinutes: tenantSettings.missingOutDetectionWindowMinutes || 120,
        missingOutNotificationFrequencyMinutes: tenantSettings.missingOutNotificationFrequencyMinutes || 15,
        // Nouveaux paramètres
        lateNotificationFrequencyMinutes: tenantSettings.lateNotificationFrequencyMinutes || 15,
        lateNotificationThresholdMinutes: tenantSettings.lateNotificationThresholdMinutes || 15,
        absenceNotificationFrequencyMinutes: tenantSettings.absenceNotificationFrequencyMinutes || 60,
        absenceDetectionBufferMinutes: tenantSettings.absenceDetectionBufferMinutes || 60,
        absencePartialNotificationFrequencyMinutes: tenantSettings.absencePartialNotificationFrequencyMinutes || 30,
      });
    }
  }, [tenantSettings]);

  const onSubmit = async (data: EmailConfigInput) => {
    try {
      await upsertConfig.mutateAsync(data);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleTestConnection = async () => {
    const formData = watch();
    setTestingConnection(true);

    const testData: TestSmtpInput = {
      host: formData.host,
      port: formData.port,
      secure: formData.secure,
      username: formData.username,
      password: formData.password === '********' ? '' : formData.password,
    };

    try {
      const result = await testConnection.mutateAsync(testData);
      if (result.success) {
        toast.success('Connexion SMTP réussie !');
      }
    } catch (error) {
      // Error handled by mutation
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail.to || !testEmail.subject) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    // Vérifier que la config existe (a un id) avant d'envoyer un email de test
    if (!config || !config.id) {
      toast.error('Veuillez d\'abord sauvegarder votre configuration avant d\'envoyer un email de test');
      return;
    }

    try {
      await sendTest.mutateAsync(testEmail);
      setShowTestDialog(false);
      setTestEmail({ to: '', subject: 'Test Email - PointaFlex' });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleSaveNotificationSettings = async () => {
    if (!user?.tenantId) {
      toast.error('Tenant ID non trouvé');
      return;
    }

    try {
      await updateSettings.mutateAsync({
        tenantId: user.tenantId,
        data: notificationSettings as UpdateTenantSettingsDto,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            <p className="font-semibold">Erreur lors du chargement de la configuration</p>
          </div>
          <div className="bg-gray-50 rounded p-4">
            <p className="text-sm text-gray-700 mb-2">
              Détails de l'erreur :
            </p>
            <code className="text-xs text-red-600 break-all">
              {error instanceof Error ? error.message : JSON.stringify(error, null, 2)}
            </code>
          </div>
          <p className="text-sm text-gray-600">
            Vous pouvez quand même créer une nouvelle configuration ci-dessous.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Activation */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Activer les emails</h3>
              <p className="text-sm text-gray-500 mt-1">
                Activez l'envoi d'emails via SMTP. Si désactivé, les emails seront simulés dans les logs.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('enabled')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {enabled && (
            <>
              {/* Configuration SMTP */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Configuration SMTP</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="provider">Fournisseur</Label>
                    <select
                      id="provider"
                      {...register('provider')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="gmail">Gmail</option>
                      <option value="smtp">SMTP Générique</option>
                      <option value="sendgrid">SendGrid</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="host">Hôte SMTP *</Label>
                    <Input
                      id="host"
                      {...register('host', { required: 'Hôte requis' })}
                      placeholder="smtp.gmail.com"
                    />
                    {errors.host && (
                      <p className="text-sm text-red-600 mt-1">{errors.host.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="port">Port *</Label>
                    <Input
                      id="port"
                      type="number"
                      {...register('port', { 
                        required: 'Port requis',
                        valueAsNumber: true,
                        min: { value: 1, message: 'Port invalide' },
                        max: { value: 65535, message: 'Port invalide' },
                      })}
                      placeholder="587"
                    />
                    {errors.port && (
                      <p className="text-sm text-red-600 mt-1">{errors.port.message}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-8">
                    <input
                      type="checkbox"
                      id="secure"
                      {...register('secure')}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="secure">Connexion sécurisée (TLS/SSL)</Label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Nom d'utilisateur</Label>
                    <Input
                      id="username"
                      {...register('username')}
                      placeholder="votre-email@gmail.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      {...register('password')}
                      placeholder="App Password (Gmail)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Pour Gmail, utilisez un App Password, pas votre mot de passe principal
                    </p>
                  </div>
                </div>
              </div>

              {/* Expéditeur */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Expéditeur</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fromName">Nom d'affichage *</Label>
                    <Input
                      id="fromName"
                      {...register('fromName', { required: 'Nom requis' })}
                      placeholder="PointaFlex"
                    />
                    {errors.fromName && (
                      <p className="text-sm text-red-600 mt-1">{errors.fromName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="fromEmail">Email expéditeur</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      {...register('fromEmail')}
                      placeholder="no-reply@domain.com"
                    />
                  </div>
                </div>
              </div>

              {/* Activation par type de notification */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Notifications par type</h3>
                <p className="text-sm text-gray-500">
                  Activez ou désactivez l'envoi d'emails pour chaque type d'anomalie
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {/* MISSING_IN */}
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div>
                      <p className="font-medium text-red-900">MISSING_IN</p>
                      <p className="text-xs text-red-700">Absence de pointage d'entrée</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('notifyMissingIn')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>

                  {/* MISSING_OUT */}
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div>
                      <p className="font-medium text-amber-900">MISSING_OUT</p>
                      <p className="text-xs text-amber-700">Session non clôturée</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('notifyMissingOut')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>

                  {/* LATE */}
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div>
                      <p className="font-medium text-orange-900">LATE</p>
                      <p className="text-xs text-orange-700">Retard détecté</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('notifyLate')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>

                  {/* ABSENCE */}
                  <div className="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-200">
                    <div>
                      <p className="font-medium text-rose-900">ABSENCE</p>
                      <p className="text-xs text-rose-700">Absence complète</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('notifyAbsence')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                    </label>
                  </div>

                  {/* ABSENCE_PARTIAL */}
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div>
                      <p className="font-medium text-purple-900">ABSENCE_PARTIAL</p>
                      <p className="text-xs text-purple-700">Absence partielle (OUT sans IN)</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('notifyAbsencePartial')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {/* ABSENCE_TECHNICAL */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <p className="font-medium text-slate-900">ABSENCE_TECHNICAL</p>
                      <p className="text-xs text-slate-700">Problème technique</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('notifyAbsenceTechnical')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                >
                  {testingConnection ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Test en cours...
                    </>
                  ) : (
                    <>
                      <TestTube className="w-4 h-4 mr-2" />
                      Tester la connexion
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTestDialog(true)}
                  disabled={!config || !config.id}
                  title={!config || !config.id ? 'Veuillez d\'abord sauvegarder votre configuration' : ''}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer un email de test
                </Button>

                <Button
                  type="submit"
                  disabled={upsertConfig.isPending}
                  className="ml-auto"
                >
                  {upsertConfig.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    'Enregistrer'
                  )}
                </Button>
              </div>
            </>
          )}

          {!enabled && (
            <div className="pt-4">
              <Button
                type="submit"
                disabled={upsertConfig.isPending}
              >
                {upsertConfig.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </Button>
            </div>
          )}
        </form>
      </Card>

      {/* MISSING_IN/OUT Notification Settings */}
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Paramètres de fréquence des notifications
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Configuration des fenêtres de détection, seuils et fréquences pour chaque type de notification
              </p>
            </div>
          </div>

          {settingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-6">
                {/* MISSING_IN Settings */}
                <div className="space-y-4 p-4 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-900">MISSING_IN (Absence de pointage d'entrée)</h4>

                  <div>
                    <Label htmlFor="missingInDetectionWindow">
                      Fenêtre de détection (minutes) *
                    </Label>
                    <Input
                      id="missingInDetectionWindow"
                      type="number"
                      min="1"
                      max="480"
                      value={notificationSettings.missingInDetectionWindowMinutes}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        missingInDetectionWindowMinutes: parseInt(e.target.value) || 30
                      })}
                      placeholder="30"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Délai après le début du shift avant de détecter une absence (défaut: 30 min)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="missingInNotificationFreq">
                      Fréquence de notification (minutes) *
                    </Label>
                    <Input
                      id="missingInNotificationFreq"
                      type="number"
                      min="5"
                      max="60"
                      value={notificationSettings.missingInNotificationFrequencyMinutes}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        missingInNotificationFrequencyMinutes: parseInt(e.target.value) || 15
                      })}
                      placeholder="15"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Intervalle entre chaque vérification par le job (défaut: 15 min)
                    </p>
                  </div>
                </div>

                {/* MISSING_OUT Settings */}
                <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="font-semibold text-amber-900">MISSING_OUT (Session non clôturée)</h4>

                  <div>
                    <Label htmlFor="missingOutDetectionWindow">
                      Fenêtre de détection (minutes) *
                    </Label>
                    <Input
                      id="missingOutDetectionWindow"
                      type="number"
                      min="1"
                      max="480"
                      value={notificationSettings.missingOutDetectionWindowMinutes}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        missingOutDetectionWindowMinutes: parseInt(e.target.value) || 120
                      })}
                      placeholder="120"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Délai après la fin du shift avant de détecter une session non clôturée (défaut: 120 min)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="missingOutNotificationFreq">
                      Fréquence de notification (minutes) *
                    </Label>
                    <Input
                      id="missingOutNotificationFreq"
                      type="number"
                      min="5"
                      max="60"
                      value={notificationSettings.missingOutNotificationFrequencyMinutes}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        missingOutNotificationFrequencyMinutes: parseInt(e.target.value) || 15
                      })}
                      placeholder="15"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Intervalle entre chaque vérification par le job (défaut: 15 min)
                    </p>
                  </div>
                </div>

                {/* LATE Settings */}
                <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-900">LATE (Retard)</h4>

                  <div>
                    <Label htmlFor="lateNotificationThreshold">
                      Seuil de notification (minutes) *
                    </Label>
                    <Input
                      id="lateNotificationThreshold"
                      type="number"
                      min="1"
                      max="120"
                      value={notificationSettings.lateNotificationThresholdMinutes}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        lateNotificationThresholdMinutes: parseInt(e.target.value) || 15
                      })}
                      placeholder="15"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Notifier uniquement si le retard dépasse X minutes (défaut: 15 min)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="lateNotificationFreq">
                      Fréquence de vérification (minutes) *
                    </Label>
                    <Input
                      id="lateNotificationFreq"
                      type="number"
                      min="5"
                      max="60"
                      value={notificationSettings.lateNotificationFrequencyMinutes}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        lateNotificationFrequencyMinutes: parseInt(e.target.value) || 15
                      })}
                      placeholder="15"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Intervalle entre chaque vérification par le job (défaut: 15 min)
                    </p>
                  </div>
                </div>

                {/* ABSENCE Settings */}
                <div className="space-y-4 p-4 bg-rose-50 rounded-lg border border-rose-200">
                  <h4 className="font-semibold text-rose-900">ABSENCE (Absence complète)</h4>

                  <div>
                    <Label htmlFor="absenceDetectionBuffer">
                      Délai après fin du shift (minutes) *
                    </Label>
                    <Input
                      id="absenceDetectionBuffer"
                      type="number"
                      min="15"
                      max="240"
                      value={notificationSettings.absenceDetectionBufferMinutes}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        absenceDetectionBufferMinutes: parseInt(e.target.value) || 60
                      })}
                      placeholder="60"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Attendre X minutes après la fin du shift avant de détecter l'absence (défaut: 60 min)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="absenceNotificationFreq">
                      Fréquence de vérification (minutes) *
                    </Label>
                    <Input
                      id="absenceNotificationFreq"
                      type="number"
                      min="15"
                      max="120"
                      value={notificationSettings.absenceNotificationFrequencyMinutes}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        absenceNotificationFrequencyMinutes: parseInt(e.target.value) || 60
                      })}
                      placeholder="60"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Intervalle entre chaque vérification par le job (défaut: 60 min)
                    </p>
                  </div>
                </div>

                {/* ABSENCE_PARTIAL Settings */}
                <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900">ABSENCE_PARTIAL (Absence partielle)</h4>

                  <div>
                    <Label htmlFor="absencePartialNotificationFreq">
                      Fréquence de vérification (minutes) *
                    </Label>
                    <Input
                      id="absencePartialNotificationFreq"
                      type="number"
                      min="15"
                      max="120"
                      value={notificationSettings.absencePartialNotificationFrequencyMinutes}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        absencePartialNotificationFrequencyMinutes: parseInt(e.target.value) || 30
                      })}
                      placeholder="30"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Intervalle entre chaque vérification par le job (défaut: 30 min)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleSaveNotificationSettings}
                  disabled={updateSettings.isPending || !user?.tenantId}
                >
                  {updateSettings.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    'Enregistrer les paramètres'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Dialog Test Email */}
      {showTestDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Envoyer un email de test</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="test-to">Destinataire *</Label>
                <Input
                  id="test-to"
                  type="email"
                  value={testEmail.to}
                  onChange={(e) => setTestEmail({ ...testEmail, to: e.target.value })}
                  placeholder="votre-email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="test-subject">Sujet *</Label>
                <Input
                  id="test-subject"
                  value={testEmail.subject}
                  onChange={(e) => setTestEmail({ ...testEmail, subject: e.target.value })}
                  placeholder="Test Email - PointaFlex"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTestDialog(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={sendTest.isPending}
                  className="flex-1"
                >
                  {sendTest.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
