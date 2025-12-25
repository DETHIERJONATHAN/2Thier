import jwt from 'jsonwebtoken';
import { db } from '../../lib/database.js';

const prisma = db;

/**
 * Middleware pour vérifier l'authentification de l'utilisateur
 * Pour les besoins de développement, cela autorisera toujours l'accès
 */
export const verifyUser = async (req, res, next) => {
    try {
        // Vérifier si un token est fourni
        const token = req.cookies.jwt || req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            // En production, exiger un token valide
            return res.status(401).json({ error: 'Authentification requise' });
        }
        
        // Vérifier et décoder le token JWT
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_for_jwt');
            req.userId = decoded.userId;
        } catch (tokenError) {
            console.error('Token JWT invalide:', tokenError);
            return res.status(401).json({ error: 'Token d\'authentification invalide' });
        }
        next();
    } catch (error) {
        console.error('Erreur d\'authentification:', error);
        res.status(401).json({ error: 'Non autorisé' });
    }
};

export default { verifyUser };
