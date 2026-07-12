import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nikita-babkin.dev"),
  title: "Nikita Babkin — Senior ML / LLM Engineer",
  description: "Production AI systems, RAG platforms, LLM agents and intelligent products.",
  openGraph:{title:"Nikita Babkin — ML / LLM Engineer",description:"Building production AI systems.",type:"website"},
  twitter:{card:"summary_large_image",title:"Nikita Babkin — ML / LLM Engineer",description:"Building production AI systems."},
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
