'use client';

import { useState } from 'react';
import { useEmailTemplates, useCreateEmailTemplate, useUpdateEmailTemplate, useDeleteEmailTemplate, useInitializeDefaultTemplates, usePreviewEmailTemplate, useSendTemplateTest } from '@/lib/hooks/useEmailAdmin';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit, Trash2, Eye, FileText, Wand2, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { EmailTemplate, EmailTemplateInput } from '@/types/email-admin';

export function EmailTemplatesTab() {
  const { data: templates, isLoading } = useEmailTemplates();
  const createTemplate = useCreateEmailTemplate();
  const updateTemplate = useUpdateEmailTemplate();
  const deleteTemplate = useDeleteEmailTemplate();
  const initializeDefaults = useInitializeDefaultTemplates();
  const previewTemplate = usePreviewEmailTemplate();
  const sendTemplateTest = useSendTemplateTest();

  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);
  const [testTemplateId, setTestTemplateId] = useState<string>('');
  const [testEmail, setTestEmail] = useState('');
  const [formData, setFormData] = useState<EmailTemplateInput>({
    code: '',
    name: '',
    description: '',
    subject: '',
    htmlContent: '',
    variables: [],
    category: 'notification',
    active: true,
  });

  const handleInitializeDefaults = async () => {
    if (!confirm('Initialiser les templates par défaut ? Les templates existants avec les mêmes codes seront conservés.')) {
      return;
    }
    await initializeDefaults.mutateAsync();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name || !formData.subject || !formData.htmlContent) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    try {
      await createTemplate.mutateAsync(formData);
      setShowForm(false);
      setFormData({
        code: '',
        name: '',
        description: '',
        subject: '',
        htmlContent: '',
        variables: [],
        category: 'notification',
        active: true,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    try {
      await updateTemplate.mutateAsync({
        id: editingTemplate.id,
        input: formData,
      });
      setShowForm(false);
      setEditingTemplate(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) return;
    await deleteTemplate.mutateAsync(id);
  };

  const handlePreview = async (template: EmailTemplate) => {
    // Créer des variables de test
    const testVariables: Record<string, string> = {};
    template.variables.forEach((varName) => {
      testVariables[varName] = `[${varName}]`;
    });

    try {
      const result = await previewTemplate.mutateAsync({
        htmlContent: template.htmlContent,
        variables: testVariables,
      });
      setPreviewHtml(result.html);
      setShowPreview(true);
    } catch (error) {
      toast.error('Erreur lors de la prévisualisation');
    }
  };

  const openEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      code: template.code,
      name: template.name,
      description: template.description || '',
      subject: template.subject,
      htmlContent: template.htmlContent,
      variables: template.variables,
      category: template.category,
      active: template.active,
    });
    setShowForm(true);
  };

  const openTestModal = (template: EmailTemplate) => {
    setTestTemplateId(template.id);
    setShowTestModal(true);
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error('Veuillez saisir une adresse email');
      return;
    }

    try {
      await sendTemplateTest.mutateAsync({
        templateId: testTemplateId,
        to: testEmail,
      });
      setShowTestModal(false);
      setTestEmail('');
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

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Templates d'emails</h3>
          <p className="text-sm text-gray-500">Gérez les templates d'emails pour les notifications</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleInitializeDefaults}
            disabled={initializeDefaults.isPending}
          >
            {initializeDefaults.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Initialisation...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Initialiser les templates par défaut
              </>
            )}
          </Button>
          <Button onClick={() => {
            setEditingTemplate(null);
            setFormData({
              code: '',
              name: '',
              description: '',
              subject: '',
              htmlContent: '',
              variables: [],
              category: 'notification',
              active: true,
            });
            setShowForm(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau template
          </Button>
        </div>
      </div>

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates?.map((template) => (
          <Card key={template.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900">{template.name}</h4>
                  {template.isDefault && (
                    <Badge variant="info" className="text-xs">Défaut</Badge>
                  )}
                  {!template.active && (
                    <Badge variant="warning" className="text-xs">Inactif</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500">{template.description || template.code}</p>
                <p className="text-xs text-gray-400 mt-1">Code: {template.code}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreview(template)}
              >
                <Eye className="w-4 h-4 mr-1" />
                Prévisualiser
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openTestModal(template)}
              >
                <Send className="w-4 h-4 mr-1" />
                Tester
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEdit(template)}
              >
                <Edit className="w-4 h-4 mr-1" />
                Modifier
              </Button>
              {!template.isDefault && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(template.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Supprimer
                </Button>
              )}
            </div>
          </Card>
        ))}

        {templates?.length === 0 && (
          <Card className="p-12 text-center col-span-2">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">Aucun template configuré</p>
            <Button onClick={handleInitializeDefaults}>
              <Wand2 className="w-4 h-4 mr-2" />
              Initialiser les templates par défaut
            </Button>
          </Card>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingTemplate ? 'Modifier le template' : 'Nouveau template'}
              </h3>
              <form onSubmit={editingTemplate ? handleUpdate : handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="MISSING_OUT"
                      disabled={!!editingTemplate}
                    />
                    <p className="text-xs text-gray-500 mt-1">Identifiant unique (ex: MISSING_OUT)</p>
                  </div>
                  <div>
                    <Label htmlFor="name">Nom *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Session non clôturée"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Notification envoyée quand..."
                  />
                </div>

                <div>
                  <Label htmlFor="subject">Sujet *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="[Pointage] Session non clôturée"
                  />
                </div>

                <div>
                  <Label htmlFor="htmlContent">Contenu HTML *</Label>
                  <textarea
                    id="htmlContent"
                    value={formData.htmlContent}
                    onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[300px] font-mono text-sm"
                    placeholder="<html>... Utilisez {{variableName}} pour les variables ...</html>"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Utilisez {'{{variableName}}'} pour insérer des variables
                  </p>
                </div>

                <div>
                  <Label htmlFor="variables">Variables disponibles (séparées par des virgules)</Label>
                  <Input
                    id="variables"
                    value={formData.variables.join(', ')}
                    onChange={(e) => setFormData({
                      ...formData,
                      variables: e.target.value.split(',').map(v => v.trim()).filter(v => v),
                    })}
                    placeholder="managerName, employeeName, sessionDate"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div>
                    <Label htmlFor="category">Catégorie</Label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="notification">Notification</option>
                      <option value="alert">Alerte</option>
                      <option value="report">Rapport</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-8">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="active">Actif</Label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingTemplate(null);
                    }}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingTemplate ? 'Modifier' : 'Créer'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Prévisualisation</h3>
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Fermer
                </Button>
              </div>
              <div
                className="border border-gray-300 rounded-lg p-4 bg-white"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Envoyer un email de test</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="testEmail">Adresse email de destination</Label>
                  <Input
                    id="testEmail"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="exemple@email.com"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSendTest();
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    L'email sera envoyé avec des données de test
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowTestModal(false);
                      setTestEmail('');
                    }}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSendTest}
                    disabled={sendTemplateTest.isPending}
                    className="flex-1"
                  >
                    {sendTemplateTest.isPending ? (
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
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
