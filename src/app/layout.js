// src/app/layout.js
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

const inter = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetMono = JetBrains_Mono({
  variable: "--font-inter-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Gestão de Obras",
  description: "Gestão de obras e colaboradores",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt" className={`${inter.variable} ${jetMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
