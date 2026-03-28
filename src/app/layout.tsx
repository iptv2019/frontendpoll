import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Plataforma de Pesquisas',
  description: 'Sistema de pesquisas online',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}
