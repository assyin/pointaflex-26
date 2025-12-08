'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2, Mail, Phone, User, Lock, Check,
  Upload, Globe, Clock, Users, Shield, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authApi } from '@/lib/api/auth';

interface RegisterFormData {
  // Étape 1 - Entreprise
  companyName: string;
  companyCode: string;
  companyEmail: string;
  companyPhone: string;
  logo?: File | null;

  // Étape 2 - Admin
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
  adminPasswordConfirm: string;

  // Étape 3 - Préférences
  timezone: string;
  dateFormat: string;
  language: string;
  currency: string;

  // Étape 4 - Conditions
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<RegisterFormData>({
    companyName: '',
    companyCode: '',
    companyEmail: '',
    companyPhone: '',
    logo: null,
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
    timezone: 'Africa/Casablanca',
    dateFormat: 'DD/MM/YYYY',
    language: 'fr',
    currency: 'MAD',
    acceptTerms: false,
    acceptPrivacy: false,
  });

  const steps = [
    { number: 1, label: 'Entreprise', icon: Building2 },
    { number: 2, label: 'Admin', icon: User },
    { number: 3, label: 'Préférences', icon: Globe },
    { number: 4, label: 'Conditions', icon: FileText },
  ];

  const validateStep = (step: number): boolean => {
    setError('');

    switch (step) {
      case 1:
        if (!formData.companyName || !formData.companyCode || !formData.companyEmail) {
          setError('Veuillez remplir tous les champs obligatoires');
          return false;
        }
        if (formData.companyCode.length < 3) {
          setError('Le code entreprise doit contenir au moins 3 caractères');
          return false;
        }
        if (!/^[a-z0-9-]+$/.test(formData.companyCode)) {
          setError('Le code entreprise ne peut contenir que des lettres minuscules, chiffres et tirets');
          return false;
        }
        break;

      case 2:
        if (!formData.adminFirstName || !formData.adminLastName || !formData.adminEmail || !formData.adminPassword) {
          setError('Veuillez remplir tous les champs obligatoires');
          return false;
        }
        if (formData.adminPassword.length < 8) {
          setError('Le mot de passe doit contenir au moins 8 caractères');
          return false;
        }
        if (formData.adminPassword !== formData.adminPasswordConfirm) {
          setError('Les mots de passe ne correspondent pas');
          return false;
        }
        break;

      case 4:
        if (!formData.acceptTerms || !formData.acceptPrivacy) {
          setError('Vous devez accepter les conditions d\'utilisation et la politique de confidentialité');
          return false;
        }
        break;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setError('');
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(4)) {
      return;
    }

    setIsLoading(true);

    try {
      await authApi.register({
        email: formData.adminEmail,
        password: formData.adminPassword,
        firstName: formData.adminFirstName,
        lastName: formData.adminLastName,
        companyName: formData.companyName,
        slug: formData.companyCode,
      });

      // Rediriger vers page de succès ou connexion
      router.push('/register/success');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue lors de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, logo: e.target.files[0] });
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl space-y-8">
          {/* Logo */}
          <div className="text-center">
            <div className="inline-flex w-16 h-16 bg-primary rounded-xl items-center justify-center mb-4">
              <span className="text-white font-bold text-2xl">PF</span>
            </div>
            <h1 className="text-h2 font-bold text-text-primary">PointageFlex</h1>
          </div>

          {/* Title */}
          <div className="text-center">
            <h2 className="text-h3 font-bold text-text-primary">Créer l'espace de votre entreprise</h2>
            <p className="text-small text-text-secondary mt-2">
              Inscrivez votre organisation et créez votre premier compte administrateur en quelques étapes.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="bg-white rounded-card p-6 shadow-card">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-medium text-text-secondary">
                Étape {currentStep} sur 4
              </span>
              <span className="text-sm font-medium text-primary">
                {steps[currentStep - 1].label}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              ></div>
            </div>

            {/* Steps navigation */}
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                        currentStep >= step.number
                          ? 'bg-primary text-white'
                          : 'bg-gray-200 text-text-secondary'
                      }`}
                    >
                      {currentStep > step.number ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        step.number
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        currentStep >= step.number ? 'text-primary' : 'text-text-secondary'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        currentStep > step.number ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    ></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="danger">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-card p-8 shadow-card space-y-6">
            {/* Step 1: Company Information */}
            {currentStep === 1 && (
              <>
                <div>
                  <h3 className="text-h4 font-semibold text-text-primary mb-2">
                    Informations entreprise
                  </h3>
                  <p className="text-small text-text-secondary">
                    Ces informations serviront à configurer votre espace et votre sous-domaine.
                  </p>
                </div>

                {/* Logo upload */}
                <div>
                  <Label>Logo (optionnel)</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-3xl font-bold text-text-secondary">
                      {formData.logo ? (
                        <img
                          src={URL.createObjectURL(formData.logo)}
                          alt="Logo"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        'PF'
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        id="logo"
                        accept="image/png,image/svg+xml"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('logo')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Importer un logo
                      </Button>
                      <p className="text-xs text-text-secondary mt-1">
                        PNG ou SVG, 200×200px recommandé.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Company name */}
                <div>
                  <Label htmlFor="companyName">
                    Nom de l'entreprise <span className="text-danger">*</span>
                  </Label>
                  <div className="mt-2 relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Ex. LogiPoint SARL"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Company code */}
                <div>
                  <Label htmlFor="companyCode">
                    Code / slug entreprise <span className="text-danger">*</span>
                  </Label>
                  <div className="mt-2 relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                    <Input
                      id="companyCode"
                      type="text"
                      placeholder="Ex. logipoint"
                      value={formData.companyCode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          companyCode: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                        })
                      }
                      className="pl-10"
                      required
                    />
                  </div>
                  {formData.companyCode && (
                    <p className="text-xs text-text-secondary mt-1">
                      Sous-domaine : <span className="font-semibold">{formData.companyCode}.pointageflex.com</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company email */}
                  <div>
                    <Label htmlFor="companyEmail">
                      Email entreprise <span className="text-danger">*</span>
                    </Label>
                    <div className="mt-2 relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                      <Input
                        id="companyEmail"
                        type="email"
                        placeholder="contact@entreprise.ma"
                        value={formData.companyEmail}
                        onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Company phone */}
                  <div>
                    <Label htmlFor="companyPhone">Téléphone (optionnel)</Label>
                    <div className="mt-2 relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                      <Input
                        id="companyPhone"
                        type="tel"
                        placeholder="+212 6 XX XX XX XX"
                        value={formData.companyPhone}
                        onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Admin Information */}
            {currentStep === 2 && (
              <>
                <div>
                  <h3 className="text-h4 font-semibold text-text-primary mb-2">
                    Compte administrateur
                  </h3>
                  <p className="text-small text-text-secondary">
                    Créez votre compte administrateur principal pour gérer l'espace.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First name */}
                  <div>
                    <Label htmlFor="adminFirstName">
                      Prénom <span className="text-danger">*</span>
                    </Label>
                    <div className="mt-2 relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                      <Input
                        id="adminFirstName"
                        type="text"
                        placeholder="Ex. Ahmed"
                        value={formData.adminFirstName}
                        onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Last name */}
                  <div>
                    <Label htmlFor="adminLastName">
                      Nom <span className="text-danger">*</span>
                    </Label>
                    <div className="mt-2 relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                      <Input
                        id="adminLastName"
                        type="text"
                        placeholder="Ex. Benjelloun"
                        value={formData.adminLastName}
                        onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Admin email */}
                <div>
                  <Label htmlFor="adminEmail">
                    Email professionnel <span className="text-danger">*</span>
                  </Label>
                  <div className="mt-2 relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                    <Input
                      id="adminEmail"
                      type="email"
                      placeholder="vous@entreprise.ma"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <Label htmlFor="adminPassword">
                    Mot de passe <span className="text-danger">*</span>
                  </Label>
                  <div className="mt-2 relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                    <Input
                      id="adminPassword"
                      type="password"
                      placeholder="••••••••••"
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    Minimum 8 caractères, incluant majuscules, minuscules et chiffres.
                  </p>
                </div>

                {/* Password confirm */}
                <div>
                  <Label htmlFor="adminPasswordConfirm">
                    Confirmer le mot de passe <span className="text-danger">*</span>
                  </Label>
                  <div className="mt-2 relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                    <Input
                      id="adminPasswordConfirm"
                      type="password"
                      placeholder="••••••••••"
                      value={formData.adminPasswordConfirm}
                      onChange={(e) => setFormData({ ...formData, adminPasswordConfirm: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Preferences */}
            {currentStep === 3 && (
              <>
                <div>
                  <h3 className="text-h4 font-semibold text-text-primary mb-2">
                    Préférences de l'espace
                  </h3>
                  <p className="text-small text-text-secondary">
                    Configurez les paramètres régionaux et les préférences de votre espace.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Timezone */}
                  <div>
                    <Label htmlFor="timezone">Fuseau horaire</Label>
                    <div className="mt-2 relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                      <select
                        id="timezone"
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-input rounded-input focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="Africa/Casablanca">Casablanca (GMT+1)</option>
                        <option value="Europe/Paris">Paris (GMT+1)</option>
                        <option value="Europe/London">Londres (GMT+0)</option>
                      </select>
                    </div>
                  </div>

                  {/* Date format */}
                  <div>
                    <Label htmlFor="dateFormat">Format de date</Label>
                    <div className="mt-2">
                      <select
                        id="dateFormat"
                        value={formData.dateFormat}
                        onChange={(e) => setFormData({ ...formData, dateFormat: e.target.value })}
                        className="w-full px-4 py-2 border border-input rounded-input focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="DD/MM/YYYY">JJ/MM/AAAA</option>
                        <option value="MM/DD/YYYY">MM/JJ/AAAA</option>
                        <option value="YYYY-MM-DD">AAAA-MM-JJ</option>
                      </select>
                    </div>
                  </div>

                  {/* Language */}
                  <div>
                    <Label htmlFor="language">Langue de l'interface</Label>
                    <div className="mt-2 relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                      <select
                        id="language"
                        value={formData.language}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-input rounded-input focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="fr">Français</option>
                        <option value="ar">العربية</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>

                  {/* Currency */}
                  <div>
                    <Label htmlFor="currency">Devise</Label>
                    <div className="mt-2">
                      <select
                        id="currency"
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="w-full px-4 py-2 border border-input rounded-input focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="MAD">MAD (Dirham marocain)</option>
                        <option value="EUR">EUR (Euro)</option>
                        <option value="USD">USD (Dollar américain)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Step 4: Terms and Conditions */}
            {currentStep === 4 && (
              <>
                <div>
                  <h3 className="text-h4 font-semibold text-text-primary mb-2">
                    Conditions générales
                  </h3>
                  <p className="text-small text-text-secondary">
                    Veuillez lire et accepter les conditions d'utilisation.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Terms checkbox */}
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <input
                      id="acceptTerms"
                      type="checkbox"
                      checked={formData.acceptTerms}
                      onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                      className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <Label htmlFor="acceptTerms" className="cursor-pointer">
                        J'accepte les{' '}
                        <Link href="/terms" className="text-primary hover:underline" target="_blank">
                          conditions générales d'utilisation
                        </Link>
                      </Label>
                      <p className="text-xs text-text-secondary mt-1">
                        En acceptant, vous reconnaissez avoir lu et compris nos conditions.
                      </p>
                    </div>
                  </div>

                  {/* Privacy checkbox */}
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <input
                      id="acceptPrivacy"
                      type="checkbox"
                      checked={formData.acceptPrivacy}
                      onChange={(e) => setFormData({ ...formData, acceptPrivacy: e.target.checked })}
                      className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <Label htmlFor="acceptPrivacy" className="cursor-pointer">
                        J'accepte la{' '}
                        <Link href="/privacy" className="text-primary hover:underline" target="_blank">
                          politique de confidentialité
                        </Link>
                      </Label>
                      <p className="text-xs text-text-secondary mt-1">
                        Vos données sont sécurisées et ne seront jamais partagées avec des tiers.
                      </p>
                    </div>
                  </div>

                  {/* Features summary */}
                  <div className="bg-primary/5 rounded-lg p-6 space-y-4">
                    <p className="font-semibold text-text-primary">
                      Après la création, vous serez redirigé vers votre tableau de bord et recevrez un email de bienvenue avec un lien de vérification.
                    </p>
                    <div className="space-y-2 text-sm text-text-secondary">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" />
                        <span>Espace multi-tenant dédié</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" />
                        <span>Terminaux biométriques configurables</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" />
                        <span>Gestion complète des employés et équipes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" />
                        <span>Rapports RH & exports pour la paie</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                Précédent
              </Button>

              {currentStep < 4 ? (
                <Button type="button" variant="primary" onClick={handleNext}>
                  Suivant
                </Button>
              ) : (
                <Button type="submit" variant="primary" disabled={isLoading}>
                  {isLoading ? 'Création en cours...' : 'Créer mon espace'}
                </Button>
              )}
            </div>

            {/* Login link */}
            <div className="text-center pt-4 border-t">
              <p className="text-small text-text-secondary">
                Vous avez déjà un compte ?{' '}
                <Link href="/login" className="text-primary font-semibold hover:underline">
                  Se connecter
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Right side - Features */}
      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-12">
        <div className="max-w-lg space-y-8">
          <div>
            <h2 className="text-h2 font-bold text-text-primary mb-4">
              Un espace dédié par entreprise
            </h2>
            <p className="text-body text-text-secondary">
              Créez un tenant séparé avec vos employés, sites, équipes et terminaux biométriques.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-text-primary mb-1">Pointage multi-canal sécurisé</h3>
                <p className="text-small text-text-secondary">
                  Empreinte, reconnaissance faciale, badge, QR code, PIN et géolocalisation mobile.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-text-primary mb-1">Plannings et shifts</h3>
                <p className="text-small text-text-secondary">
                  Shifts matin/soir/nuit, rotations, remplacements et vue calendrier pour managers.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-text-primary mb-1">Droits par rôle</h3>
                <p className="text-small text-text-secondary">
                  Espaces adaptés pour RH, managers et employés, avec validations de congés intégrées.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-text-primary mb-1">Rapports & paie</h3>
                <p className="text-small text-text-secondary">
                  Heures travaillées, retards, absences, exports CSV/Excel/PDF pour la paie.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
