import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, FileImage, Type, Webhook } from 'lucide-react';
import ColorSettings from '@/components/settings/ColorSettings';
import LogoSettings from '@/components/settings/LogoSettings';
import TextSettings from '@/components/settings/TextSettings';
import WebhookSettings from '@/components/settings/WebhookSettings';

export default function Settings() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
          <p className="text-muted-foreground">
            Personalize a aparência e informações do sistema
          </p>
        </div>

        <Tabs defaultValue="colors" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="colors">
              <Palette className="h-4 w-4 mr-2" />
              Cores
            </TabsTrigger>
            <TabsTrigger value="logos">
              <FileImage className="h-4 w-4 mr-2" />
              Imagens
            </TabsTrigger>
            <TabsTrigger value="text">
              <Type className="h-4 w-4 mr-2" />
              Textos
            </TabsTrigger>
            <TabsTrigger value="webhook">
              <Webhook className="h-4 w-4 mr-2" />
              Webhook
            </TabsTrigger>
          </TabsList>

          <TabsContent value="colors">
            <ColorSettings />
          </TabsContent>

          <TabsContent value="logos">
            <LogoSettings />
          </TabsContent>

          <TabsContent value="text">
            <TextSettings />
          </TabsContent>

          <TabsContent value="webhook">
            <WebhookSettings />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
