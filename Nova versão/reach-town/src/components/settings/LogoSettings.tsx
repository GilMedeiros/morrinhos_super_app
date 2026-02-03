import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Trash2, FileImage } from 'lucide-react';

export default function LogoSettings() {
  const { settings, updateSetting } = useSystemSettings();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, type: 'logo' | 'favicon') => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('system-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('system-assets')
        .getPublicUrl(filePath);

      await updateSetting(`${type}_url`, publicUrl);

      toast({
        title: 'Upload realizado',
        description: `${type === 'logo' ? 'Logo' : 'Favicon'} atualizado com sucesso`,
      });

      // Update favicon in the document
      if (type === 'favicon') {
        const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (link) {
          link.href = publicUrl;
        } else {
          const newLink = document.createElement('link');
          newLink.rel = 'icon';
          newLink.href = publicUrl;
          document.head.appendChild(newLink);
        }
      }

      // Reload to show new images
      window.location.reload();
    } catch (error: any) {
      toast({
        title: 'Erro no upload',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é 2MB',
        variant: 'destructive',
      });
      return;
    }

    uploadFile(file, type);
  };

  const handleRemove = async (type: 'logo' | 'favicon') => {
    try {
      await updateSetting(`${type}_url`, '');
      toast({
        title: 'Removido',
        description: `${type === 'logo' ? 'Logo' : 'Favicon'} removido com sucesso`,
      });
      window.location.reload();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Logo do Sistema</CardTitle>
          <CardDescription>
            Logo exibida no menu lateral e na página de login
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.logo_url && (
            <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
              <img
                src={settings.logo_url}
                alt="Logo atual"
                className="max-h-24 object-contain"
              />
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'logo')}
              className="hidden"
            />
            <Button
              onClick={() => logoInputRef.current?.click()}
              disabled={uploading}
              variant="outline"
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Enviando...' : 'Upload Logo'}
            </Button>
            {settings.logo_url && (
              <Button
                onClick={() => handleRemove('logo')}
                variant="destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Formatos aceitos: PNG, JPG, SVG. Tamanho máximo: 2MB
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Favicon</CardTitle>
          <CardDescription>
            Ícone exibido na aba do navegador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.favicon_url && (
            <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
              <img
                src={settings.favicon_url}
                alt="Favicon atual"
                className="max-h-16 object-contain"
              />
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'favicon')}
              className="hidden"
            />
            <Button
              onClick={() => faviconInputRef.current?.click()}
              disabled={uploading}
              variant="outline"
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Enviando...' : 'Upload Favicon'}
            </Button>
            {settings.favicon_url && (
              <Button
                onClick={() => handleRemove('favicon')}
                variant="destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Recomendado: 32x32 ou 16x16 pixels. Formato: ICO, PNG
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
