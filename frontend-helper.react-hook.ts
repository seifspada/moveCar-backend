/**
 * 📁 React Hook - À placer dans: src/hooks/useDocumentUrl.ts
 * Utilise le service config pour résoudre les URLs de documents
 */

import { useEffect, useState } from 'react';
import { getApiConfig } from '../services/config';

/**
 * Hook React pour construire l'URL d'un document uploadé
 * @param cheminFichier - Ex: "/uploads/demandes-adhesion/1/file.png"
 * @returns { url: string, isLoading: boolean, error: Error | null }
 */
export function useDocumentUrl(cheminFichier: string | null) {
  const [url, setUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!cheminFichier) {
      setUrl('');
      setIsLoading(false);
      return;
    }

    // Si c'est déjà une URL complète
    if (cheminFichier.startsWith('http://') || cheminFichier.startsWith('https://')) {
      setUrl(cheminFichier);
      setIsLoading(false);
      return;
    }

    // Sinon, récupérer l'apiBase
    getApiConfig()
      .then((config) => {
        setUrl(`${config.apiBase}${cheminFichier}`);
        setError(null);
      })
      .catch((err) => {
        setError(err);
        console.error('Failed to build document URL:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [cheminFichier]);

  return { url, isLoading, error };
}

/**
 * Composant pour afficher une image de document
 */
export function DocumentImage({
  src,
  alt = 'Document',
  ...props
}: { src: string | null; alt?: string } & React.ImgHTMLAttributes<HTMLImageElement>) {
  const { url, isLoading, error } = useDocumentUrl(src);

  if (error) {
    return <div className="error">❌ Impossible de charger l'image: {error.message}</div>;
  }

  if (isLoading) {
    return <div className="loading">⏳ Chargement...</div>;
  }

  if (!url) {
    return <div className="empty">Pas d'image</div>;
  }

  return <img src={url} alt={alt} {...props} />;
}

/**
 * Exemple d'utilisation:
 * 
 * // Version classique avec hook
 * function MyComponent() {
 *   const { url } = useDocumentUrl(document.cheminFichier);
 *   return <img src={url} />;
 * }
 *
 * // Version avec composant
 * function MyComponent() {
 *   return <DocumentImage src={document.cheminFichier} alt="Carte d'identité" />;
 * }
 */
