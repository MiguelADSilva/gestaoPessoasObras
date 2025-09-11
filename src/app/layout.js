import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// importa o CSS do Font Awesome (instalado via npm)
import "@fortawesome/fontawesome-free/css/all.min.css";

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
      <body className={`${inter.variable} ${jetMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
