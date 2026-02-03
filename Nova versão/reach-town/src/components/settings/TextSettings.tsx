import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Save } from 'lucide-react';

export default function TextSettings() {
  const { settings, updateSetting } = useSystemSettings();
  const { toast } = useToast();
  const [appName, setAppName] = useState(settings.app_name);
  const [appSubtitle, setAppSubtitle] = useState(settings.app_subtitle);
  const [pageTitle, setPageTitle] = useState(settings.page_title);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAppName(settings.app_name);
    setAppSubtitle(settings.app_subtitle);
    setPageTitle(settings.page_title);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSetting('app_name', appName);
      await updateSetting('app_subtitle', appSubtitle);
      await updateSetting('page_title', pageTitle);

      // Update page title immediately
      document.title = pageTitle;

      toast({
        title: 'Textos atualizados',
        description: 'As alterações foram salvas. Recarregue a página para ver todas as mudanças.',
      });

      // Reload to apply sidebar changes
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Textos do Sistema</CardTitle>
        <CardDescription>
          Personalize os textos exibidos no sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="pageTitle">Título da Página</Label>
          <Input
            id="pageTitle"
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            placeholder="Sistema de Gestão Municipal"
          />
          <p className="text-xs text-muted-foreground">
            Exibido na aba do navegador
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="appName">Nome do Menu (Linha 1)</Label>
          <Input
            id="appName"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="Prefeitura"
          />
          <p className="text-xs text-muted-foreground">
            Primeira linha do nome no menu lateral
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="appSubtitle">Nome do Menu (Linha 2)</Label>
          <Input
            id="appSubtitle"
            value={appSubtitle}
            onChange={(e) => setAppSubtitle(e.target.value)}
            placeholder="Morrinhos"
          />
          <p className="text-xs text-muted-foreground">
            Segunda linha do nome no menu lateral
          </p>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">Preview do Menu:</p>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold">M</span>
            </div>
            <div>
              <p className="font-semibold text-sm">{appName}</p>
              <p className="text-xs text-muted-foreground">{appSubtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Textos'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
