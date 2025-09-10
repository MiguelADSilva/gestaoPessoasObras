import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
config.autoAddCss = false;

const inter = Inter({
  variable: "--font-Inter-sans",
  subsets: ["latin"],
});

const jetMono = JetBrains_Mono({
  variable: "--font-Inter-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Gestão de Obras",
  description: "Gestão de obras e colaboradores",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <head>
        {/* Font Awesome para os ícones */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
          integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkfFvFvijF3bJ8Pq24apqYhZQ5GNsq4CPrlGHBXHiYIOCwVh5M/zN2zKg=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className={`${inter.variable} ${jetMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
