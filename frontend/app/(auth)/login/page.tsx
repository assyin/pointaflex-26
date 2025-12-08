'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, Building2, Fingerprint, Calendar, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authApi } from '@/lib/api/auth';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const [formData, setFormData] = useState({
    tenantCode: '',
    email: '',
    password: '',
    rememberMe: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.login({
        email: formData.email,
        password: formData.password,
      });

      // Sauvegarder les tokens
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('tenantId', response.user.tenantId);

      // Réinitialiser les tentatives échouées
      setFailedAttempts(0);

      // Rediriger vers le dashboard
      router.push('/dashboard');
    } catch (err: any) {
      // Incrémenter les tentatives échouées
      setFailedAttempts(prev => prev + 1);
      setError(err.response?.data?.message || 'Email ou mot de passe incorrect. Vérifiez vos identifiants et réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center">
            <div className="inline-flex w-16 h-16 bg-primary rounded-xl items-center justify-center mb-4">
              <span className="text-white font-bold text-2xl">PF</span>
            </div>
            <h1 className="text-h2 font-bold text-text-primary">PointageFlex</h1>
          </div>

          {/* Title */}
          <div className="text-center">
            <h2 className="text-h3 font-bold text-text-primary">Connexion à votre espace</h2>
            <p className="text-small text-text-secondary mt-2">
              Accédez à votre espace entreprise, vos pointages et vos plannings
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="danger">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Code entreprise (optionnel) */}
            <div>
              <Label htmlFor="tenantCode">Code entreprise (optionnel)</Label>
              <div className="mt-2 relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                <Input
                  id="tenantCode"
                  type="text"
                  placeholder="Ex: logipoint, acme, mycompany"
                  value={formData.tenantCode}
                  onChange={(e) => setFormData({ ...formData, tenantCode: e.target.value })}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Renseignez votre code si vous ne vous connectez pas via un sous-domaine dédié.
              </p>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email professionnel</Label>
              <div className="mt-2 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@entreprise.ma"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="mt-2 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <Label htmlFor="rememberMe" className="ml-2 cursor-pointer">
                Se souvenir de moi
              </Label>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>

            {/* Security warning - shown after 3 failed attempts */}
            {failedAttempts >= 3 && (
              <Alert variant="warning">
                <AlertDescription className="text-center">
                  ⚠️ Plusieurs tentatives de connexion échouées détectées.<br />
                  Vérifiez vos identifiants ou contactez votre administrateur.
                </AlertDescription>
              </Alert>
            )}

            {/* Register link */}
            <div className="text-center pt-4">
              <p className="text-small text-text-secondary">
                Pas encore inscrit ?{' '}
                <Link href="/register" className="text-primary font-semibold hover:underline">
                  Créer un compte
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
              Gestion de présence moderne pour vos équipes
            </h2>
            <p className="text-body text-text-secondary">
              Unifiez pointage, plannings et congés dans un espace unique adapté aux entreprises au Maroc et à l'international.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                  <Fingerprint className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-text-primary mb-1">Pointage multi-canal</h3>
                <p className="text-small text-text-secondary">
                  Biométrie (empreinte, visage), badge, QR code, PIN et géolocalisation mobile.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-text-primary mb-1">Plannings & équipes</h3>
                <p className="text-small text-text-secondary">
                  Shifts matin/soir/nuit, remplacements, vue semaine/mois pour une organisation optimale.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-text-primary mb-1">Rapports RH & paie</h3>
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
