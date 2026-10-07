import React, { useState, useEffect } from "react";

/**
 * 1. Função Utilitária Global para extrair o domínio limpo de qualquer URL ou string
 * Remove protocolos (http, https), subdomínios 'www', portas, caminhos e parâmetros.
 */
export function extractCleanDomain(urlOrDomain?: string | null): string {
  if (!urlOrDomain) return "";
  try {
    let clean = urlOrDomain.trim().toLowerCase();
    // Remove tags ou caracteres residuais
    clean = clean.replace(/^[<>"'(\[:]+|[>"')\],;:.]+$/g, "");
    // Remove protocolo
    clean = clean.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "");
    // Remove query params, hash e caminhos
    clean = clean.split("/")[0].split("?")[0].split("#")[0];
    // Remove porta se houver (ex: localhost:3000 -> localhost)
    clean = clean.split(":")[0];
    // Remove trailing dots or punctuation
    clean = clean.replace(/[.,;:]+$/, "");
    return clean;
  } catch {
    return "";
  }
}

/**
 * Retorna a URL do favicon baseada no provedor
 */
export function getFaviconUrl(urlOrDomain?: string | null, provider: "vemetric" | "google" = "vemetric"): string {
  const domain = extractCleanDomain(urlOrDomain);
  if (!domain) return "";
  if (provider === "vemetric") {
    return `https://vemetric.com/${domain}`;
  }
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

export interface FaviconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  urlOrDomain?: string | null;
  size?: number | string;
  fallbackIcon?: React.ReactNode;
  containerClassName?: string;
}

/**
 * Componente Favicon Global com fallback automático de Vemetric -> Google
 */
export function Favicon({
  urlOrDomain,
  size = 14,
  className = "",
  containerClassName = "",
  fallbackIcon,
  alt = "",
  ...imgProps
}: FaviconProps) {
  const domain = extractCleanDomain(urlOrDomain);
  const [currentSrc, setCurrentSrc] = useState<string>(() => (domain ? `https://vemetric.com/${domain}` : ""));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (domain) {
      setCurrentSrc(`https://vemetric.com/${domain}`);
      setHasError(false);
    } else {
      setHasError(true);
    }
  }, [domain]);

  if (!domain || hasError) {
    if (fallbackIcon) {
      return <span className={`inline-flex shrink-0 items-center justify-center ${containerClassName}`}>{fallbackIcon}</span>;
    }
    return (
      <span
        style={{ width: size, height: size }}
        className={`inline-flex shrink-0 items-center justify-center text-white/40 ${containerClassName}`}
      >
        <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M3.5 12h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      </span>
    );
  }

  return (
    <span
      style={{ width: size, height: size }}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${containerClassName}`}
    >
      <img
        src={currentSrc}
        alt={alt || domain}
        style={{ width: size, height: size }}
        className={`object-contain ${className}`}
        loading="lazy"
        onError={() => {
          // Se falhou na Vemetric, tenta o Google Favicon como fallback
          if (currentSrc.includes("vemetric.com")) {
            setCurrentSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
          } else {
            // Se falhou no Google também, exibe o fallback genérico
            setHasError(true);
          }
        }}
        {...imgProps}
      />
    </span>
  );
}
