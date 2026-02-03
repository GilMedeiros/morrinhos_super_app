import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SystemSettings {
  primary_color: string;
  accent_color: string;
  app_name: string;
  app_subtitle: string;
  page_title: string;
  logo_url?: string;
  favicon_url?: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  primary_color: '356 95% 45%',
  accent_color: '145 63% 49%',
  app_name: 'Prefeitura',
  app_subtitle: 'Morrinhos',
  page_title: 'Sistema de Gestão Municipal',
};

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');

      if (error) {
        console.error('Error loading settings:', error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const settingsObj: any = {};
        data.forEach((item) => {
          settingsObj[item.key] = item.value;
        });
        setSettings((prev) => ({ ...prev, ...settingsObj }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key, value }, { onConflict: 'key' });

      if (error) throw error;

      setSettings((prev) => ({ ...prev, [key]: value }));

      return { success: true };
    } catch (error: any) {
      console.error('Error updating setting:', error);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    loadSettings().catch(err => {
      console.error('Failed to load settings:', err);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!loading && typeof document !== 'undefined') {
      try {
        const root = document.documentElement;
        
        if (settings.primary_color) {
          root.style.setProperty('--primary', settings.primary_color);
        }
        
        if (settings.accent_color) {
          root.style.setProperty('--accent', settings.accent_color);
        }
      } catch (error) {
        console.error('Error applying colors:', error);
      }
    }
  }, [loading, settings.primary_color, settings.accent_color]);

  useEffect(() => {
    if (!loading && typeof document !== 'undefined' && settings.page_title) {
      try {
        document.title = settings.page_title;
      } catch (error) {
        console.error('Error updating title:', error);
      }
    }
  }, [loading, settings.page_title]);

  return {
    settings,
    loading,
    updateSetting,
    reload: loadSettings,
  };
}
