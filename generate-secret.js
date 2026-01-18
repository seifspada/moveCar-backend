const crypto = require('crypto');

// Générer une clé aléatoire de 64 bytes (512 bits)
const secret = crypto.randomBytes(64).toString('hex');

console.log('Votre JWT_SECRET:');
console.log(secret);
console.log('\nAjoutez ceci dans votre .env:');
console.log(`JWT_SECRET="${secret}"`);
