import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Ngày Cống Hiến",
  description: "1 chú khỉ buồn ở tầng 7",
  openGraph: {
    title: "Ngày Cống Hiến",
    description: "1 chú khỉ buồn ở tầng 7",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ngày Cống Hiến",
    description: "1 chú khỉ buồn ở tầng 7",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
