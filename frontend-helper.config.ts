/**
 * 📁 À placer dans votre frontend: src/services/config.ts
 * Résout le problème de Mixed Content en production
 */

interface ApiConfig {
  apiBase: string;
  uploadsPath: string;
  environment: string;
}

let cachedConfig: ApiConfig | null = null;

/**
 * Récupère la configuration du backend
 * Utilise le cache pour éviter des appels répétés
 */
export async function getApiConfig(): Promise<ApiConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const response = await fetch('/config');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    cachedConfig = await response.json();
    console.log('✅ API Config loaded:', cachedConfig);
    return cachedConfig;
  } catch (error) {
    console.error('❌ Failed to load config:', error);
    // Fallback pour le développement
    return {
      apiBase: import.meta.env.VITE_API_BASE || 'http://localhost:3000',
      uploadsPath: '/uploads',
      environment: 'unknown',
    };
  }
}

/**
 * Construit l'URL complète d'un document uploadé
 * @param cheminFichier - Chemin relatif: "/uploads/demandes-adhesion/1/file.png"
 * @returns URL complète: "https://api.example.com/uploads/demandes-adhesion/1/file.png"
 */
export async function buildDocumentUrl(cheminFichier: string): Promise<string> {
  if (!cheminFichier) return '';

  const config = await getApiConfig();
  
  // Si c'est déjà une URL complète, retourner as-is
  if (cheminFichier.startsWith('http://') || cheminFichier.startsWith('https://')) {
    return cheminFichier;
  }

  // Sinon, construire avec apiBase
  return `${config.apiBase}${cheminFichier}`;
}

/**
 * Hook React pour récupérer le config une seule fois au démarrage
 */
export function useApiConfig() {
  return getApiConfig();
}

// Export pour utilisation globale
export default { getApiConfig, buildDocumentUrl, useApiConfig };
