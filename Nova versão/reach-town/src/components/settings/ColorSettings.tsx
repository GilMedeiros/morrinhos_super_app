import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Save, RotateCcw } from 'lucide-react';

export default function ColorSettings() {
  const { settings, updateSetting } = useSystemSettings();
  const { toast } = useToast();
  const [primaryColor, setPrimaryColor] = useState(settings.primary_color);
  const [accentColor, setAccentColor] = useState(settings.accent_color);
  const [saving, setSaving] = useState(false);

  const parseHslToHex = (hsl: string): string => {
    const [h, s, l] = hsl.split(' ').map(v => parseFloat(v.replace('%', '')));
    const hDecimal = h / 360;
    const sDecimal = s / 100;
    const lDecimal = l / 100;

    const hslToRgb = (h: number, s: number, l: number) => {
      let r, g, b;
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    };

    const [r, g, b] = hslToRgb(hDecimal, sDecimal, lDecimal);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const parseHexToHsl = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSetting('primary_color', primaryColor);
      await updateSetting('accent_color', accentColor);

      toast({
        title: 'Cores atualizadas',
        description: 'As cores foram aplicadas com sucesso',
      });
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

  const handleReset = () => {
    setPrimaryColor('356 95% 45%');
    setAccentColor('145 63% 49%');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cores do Sistema</CardTitle>
        <CardDescription>
          Personalize as cores principais do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="primary">Cor Primária</Label>
            <div className="flex gap-2">
              <Input
                id="primary"
                type="color"
                value={parseHslToHex(primaryColor)}
                onChange={(e) => setPrimaryColor(parseHexToHsl(e.target.value))}
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="356 95% 45%"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Formato: H S% L% (ex: 356 95% 45%)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accent">Cor de Destaque</Label>
            <div className="flex gap-2">
              <Input
                id="accent"
                type="color"
                value={parseHslToHex(accentColor)}
                onChange={(e) => setAccentColor(parseHexToHsl(e.target.value))}
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="145 63% 49%"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Formato: H S% L% (ex: 145 63% 49%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
          <div 
            className="w-12 h-12 rounded-md" 
            style={{ backgroundColor: parseHslToHex(primaryColor) }}
          />
          <div 
            className="w-12 h-12 rounded-md" 
            style={{ backgroundColor: parseHslToHex(accentColor) }}
          />
          <div className="ml-2">
            <p className="text-sm font-medium">Preview</p>
            <p className="text-xs text-muted-foreground">
              As cores serão aplicadas ao salvar
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrão
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Cores'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
