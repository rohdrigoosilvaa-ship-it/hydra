import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // PWA básico (Fase 2 do plano de operação de campo): só instalação +
    // cache de assets estáticos. Nenhuma chamada de API é cacheada de
    // propósito — a fila de dados offline é uma fase futura separada.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "logo-full.png", "logo-mark.png"],
      manifest: {
        name: "ProtecOne",
        short_name: "ProtecOne",
        description: "Gestão inteligente de SST — operação de campo e gestão em um só lugar.",
        lang: "pt-BR",
        theme_color: "#0a6e34",
        background_color: "#f5f6f6",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Só os assets do próprio build (JS/CSS/HTML/ícones) — API nunca é
        // interceptada, sempre vai direto pra rede.
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
  server: {
    port: 5174,
  },
});
