# 🚀 Configuration Production - Upload de Documents

## 📋 Problème Identifié

**Mixed Content Error** en production:
- Frontend (HTTPS Vercel) → Backend (HTTP localhost)
- Événement: "The page at 'https://move-car-one.vercel.app' was loaded over HTTPS, but requested an insecure element 'http://localhost:3000/uploads/...'"

## ✅ Solutions Appliquées

### Backend (NestJS + Fastify)

✔️ **main.ts** - Fichiers statiques configurés:
```typescript
await app.register(fastifyStatic as any, {
  root: uploadsPath,  // /uploads directory
  prefix: '/uploads/',
  decorateReply: false,
});
```

✔️ **app.controller.ts** - Nouveau endpoint `/config`:
```bash
GET /config
Returns: { apiBase: "https://...", uploadsPath: "/uploads", ... }
```

### Frontend (React/Next.js)

❌ **AVANT** - Hardcodé localhost:
```typescript
<img src="http://localhost:3000${cheminFichier}" />
```

✅ **APRÈS** - URLs dynamiques:
```typescript
// 1. Appeler /config au démarrage
const response = await fetch('/config');
const { apiBase } = await response.json();

// 2. Construire les URLs dynamiquement
<img src={`${apiBase}${cheminFichier}`} />
```

## 🔧 Checklist Production

### 1. Backend Render.com (ou votre hébergement)

- [ ] Variables d'environnement définies:
  ```
  NODE_ENV=production
  DATABASE_URL=postgresql://...
  JWT_SECRET=...
  ```

- [ ] Dossier `uploads/` existe ET est accessible
  ```bash
  ls -la uploads/
  ```

- [ ] Port correct (Render utilise port défini dans $PORT):
  ```typescript
  const port = process.env.PORT || 3000;
  ```

### 2. Frontend Vercel

- [ ] Service API configuré pour utiliser `/config`:
  ```typescript
  // src/services/api.ts
  async function initializeApiBase() {
    const response = await fetch('/config');
    window.API_BASE = (await response.json()).apiBase;
  }
  ```

- [ ] Variables d'environnement (si nécessaire):
  ```
  VITE_API_BASE= (laissez vide pour URLs relatives)
  ```

### 3. CORS (Déjà Configuré ✅)

```typescript
// app/main.ts - Autorise Vercel et localhost
const allowedOrigins = isDevelopment
  ? ['*']
  : [
      'https://move-car-one.vercel.app',
      /^https:\/\/move-car.*\.vercel\.app$/,  // Preview URLs
      'http://localhost:3001',
    ];
```

### 4. Test d'Accès aux Documents

**Option A - Via le nouvel endpoint (recommandé)**:
```bash
curl https://your-backend-url/config

# Doit retourner:
# {
#   "apiBase": "https://your-backend-url",
#   "uploadsPath": "/uploads",
#   "environment": "production"
# }
```

**Option B - Accès direct (doit retourner 200)**:
```bash
curl https://your-backend-url/uploads/demandes-adhesion/1/test.png
# 200 OK - Le fichier existe et est accessible
# 404 Not Found - Le fichier n'existe pas
# 403 Forbidden - Le serveur static n'est pas activé ❌
```

## 🐛 Troubleshooting

### Erreur: "ERR_CONNECTION_REFUSED"
**Cause**: Frontend tente `http://localhost:3000` depuis le navigateur client
**Solution**: 
1. Implémenter le nouveau endpoint `/config`
2. Utiliser les URLs retournées dynamiquement

### Erreur: "Mixed Content"
**Cause**: HTTPS → HTTP
**Solution**:
- Vérifier que le backend est en HTTPS (`.vercel.app` force HTTPS)
- Vérifier les headers `x-forwarded-proto`
- Le backend doit retourner `https://`

### Images Ne S'Affichent Pas en Production
**Vérifier**:
1. Les fichiers existent sur le serveur:
   ```bash
   ls -la uploads/demandes-adhesion/
   ```
2. Les permissions sont correctes:
   ```bash
   chmod 755 -R uploads/
   ```
3. La route `/uploads/` est bien enregistrée:
   ```bash
   curl -v https://backend-url/uploads/ 
   # Doit voir: "x-fastify-static" ou "Server: fastify"
   ```

## 📚 Références

- [Fastify Static Files](https://github.com/fastify/fastify-static)
- [Mixed Content Errors](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content)
- [X-Forwarded Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For)

## 🎯 Prochaines Étapes

1. **Déployer le backend** avec les changements (main.ts + app.controller.ts)
2. **Mettre à jour le frontend** pour utiliser `/config`
3. **Tester** via: 
   ```javascript
   // Dans la console du navigateur en production:
   fetch('/config').then(r => r.json()).then(console.log)
   ```
4. **Vérifier** que les images s'affichent sans erreur

---

✅ **Configuration faite d'après les fichiers actuels**
- main.ts: Fastify static activé ✅
- app.controller.ts: Endpoint /config ajouté ✅
- CORS: Vercel autorisé ✅

À faire côté frontend 👈
