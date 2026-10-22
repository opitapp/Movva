# MOVVA

PWA de atividades físicas construída com React, TypeScript, Vite, Leaflet e OpenStreetMap.

## Executar localmente

```bash
npm install
npm run dev
```

## Testar build

```bash
npm run build
npm run preview
```

## Publicar na Vercel

1. Extraia este ZIP.
2. Envie a pasta para um repositório GitHub.
3. Na Vercel, selecione **Add New → Project** e importe o repositório.
4. Framework preset: Vite; Build command `npm run build`; Output directory `dist`.
5. Clique em Deploy. O endereço `*.vercel.app` será criado automaticamente.

Alternativamente, com Vercel CLI: `npm i -g vercel`, depois `vercel` na pasta do projeto e `vercel --prod` para produção.

## PWA

O manifesto e o ícone estão configurados. Para funcionar como instalação PWA completa em todos os navegadores, esta versão ainda precisa de um service worker/offline caching; a abertura em modo standalone depende do navegador e da instalação. A hospedagem deve usar HTTPS (a Vercel fornece HTTPS).

## GPS e mapas

- O GPS real exige HTTPS, permissão de localização e dispositivo com geolocalização.
- Distância é calculada a partir dos pontos GPS aceitos; a precisão depende do aparelho/sinal.
- Frequência cardíaca e elevação não são simuladas como dados reais.
- O botão de demonstração grava uma atividade marcada como DEMO.
- Os dados de atividade ficam em `localStorage` no dispositivo atual; não sincronizam entre aparelhos nem têm conta/backup na nuvem.
- Os tiles usam `tile.openstreetmap.org`, com atribuição. O serviço comunitário tem política de uso e não oferece SLA nem uso ilimitado. Para crescimento, considere um provedor de tiles compatível ou infraestrutura própria.

## Limites desta primeira versão

Esta é uma primeira versão funcional, não uma cópia completa do Strava. Ainda não inclui contas, sincronização na nuvem, comunidade, segmentos globais, desafios competitivos, compartilhamento social ou integração com sensores de frequência cardíaca.
