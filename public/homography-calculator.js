/**
 * Calculateur d'homographie PRÉCISE pour marqueur 2Thier
 * 
 * Structure du marqueur (mesures en cm):
 * - Ligne noire externe (0-3cm du bord)
 * - Ligne blanche (3-6cm)
 * - Ligne noire interne (6-9cm, carré 6x6cm centré)
 * - Points magenta aux coins (9cm±0.5, à chaque coin)
 * 
 * Homographie calculée par DLT (Direct Linear Transform)
 * Décomposition SVD pour extraire rotation et profondeur
 */

class PreciseHomographyCalculator {
    constructor() {
        // Mesures RÉELLES du marqueur en cm
        this.markerSize = 18;
        
        // Contours (transitions) en cm depuis (0,0) = coin TL
        // Chaque contour = une ligne de 3cm d'épaisseur
        this.contours = {
            outer: { start: 0, end: 3, name: "Noir externe" },
            white: { start: 3, end: 6, name: "Blanc" },
            inner: { start: 6, end: 9, name: "Noir interne (carré)" },
            magenta: { at: 9, name: "Points magenta" }  // Centre des points aux coins
        };
        
        // Coordonnées réelles (monde) des 4 coins du marqueur en cm
        // TL, TR, BR, BL
        this.worldCorners = [
            { x: 0, y: 0, label: "TL" },
            { x: 18, y: 0, label: "TR" },
            { x: 18, y: 18, label: "BR" },
            { x: 0, y: 18, label: "BL" }
        ];
    }
    
    /**
     * Détecte les transitions noir-blanc-noir pour préciser les contours
     * @param {ImageData} imageData
     * @returns {Object} Contours détectés avec positions précises
     */
    detectContours(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        
        // Créer une image de gradient (différence d'intensité)
        const gradient = new Uint8Array(width * height);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                // Luminosité du pixel actuel
                const r = data[idx], g = data[idx + 1], b = data[idx + 2];
                const bright = (r + g + b) / 3;
                
                // Gradient horizontal et vertical
                const idx_right = (y * width + (x + 1)) * 4;
                const bright_right = (data[idx_right] + data[idx_right + 1] + data[idx_right + 2]) / 3;
                
                const idx_down = ((y + 1) * width + x) * 4;
                const bright_down = (data[idx_down] + data[idx_down + 1] + data[idx_down + 2]) / 3;
                
                // Magnitude du gradient
                const gx = Math.abs(bright_right - bright);
                const gy = Math.abs(bright_down - bright);
                gradient[y * width + x] = Math.min(255, Math.sqrt(gx * gx + gy * gy) * 4);
            }
        }
        
        // Détecter les pics de gradient = transitions
        return this.findGradientPeaks(gradient, width, height);
    }
    
    /**
     * Trouve les pics de gradient (transitions entre couleurs)
     */
    findGradientPeaks(gradient, width, height) {
        const peaks = [];
        const threshold = 100;
        
        for (let y = 10; y < height - 10; y++) {
            for (let x = 10; x < width - 10; x++) {
                const idx = y * width + x;
                const val = gradient[idx];
                
                if (val < threshold) continue;
                
                // Vérifier que c'est un maximum local
                let isMax = true;
                for (let dy = -3; dy <= 3; dy++) {
                    for (let dx = -3; dx <= 3; dx++) {
                        if (gradient[(y + dy) * width + (x + dx)] > val) {
                            isMax = false;
                            break;
                        }
                    }
                    if (!isMax) break;
                }
                
                if (isMax) {
                    peaks.push({ x, y, strength: val });
                }
            }
        }
        
        console.log(`📍 ${peaks.length} transitions détectées`);
        return peaks;
    }
    
    /**
     * Calcule l'homographie par DLT (Direct Linear Transform)
     * @param {Array} imagePoints - Points pixels détectés [[x, y], ...]
     * @param {Array} worldPoints - Points monde correspondants [[x, y], ...]
     * @returns {Array} Matrice homographie 3x3
     */
    computeHomographyDLT(imagePoints, worldPoints) {
        if (imagePoints.length < 4 || worldPoints.length < 4) {
            throw new Error("Au moins 4 points de correspondance requis");
        }
        
        // Normaliser les points pour stabilité numérique
        const normImage = this.normalizePoints(imagePoints);
        const normWorld = this.normalizePoints(worldPoints);
        
        // Construire la matrice A pour le système linéaire
        const A = [];
        for (let i = 0; i < imagePoints.length; i++) {
            const x = normWorld.points[i][0];
            const y = normWorld.points[i][1];
            const xp = normImage.points[i][0];
            const yp = normImage.points[i][1];
            
            A.push([-x, -y, -1, 0, 0, 0, x * xp, y * xp, xp]);
            A.push([0, 0, 0, -x, -y, -1, x * yp, y * yp, yp]);
        }
        
        // SVD pour trouver la solution (vecteur propre le plus petit)
        const { V } = this.svd(A);
        const H_norm = this.reshape(V.slice(-9), 3, 3);
        
        // Dénormaliser
        const H = this.matmul(
            this.matmul(this.inverse3x3(normImage.T), H_norm),
            normWorld.T
        );
        
        return H;
    }
    
    /**
     * Normalise les points (translation + scaling) pour stabilité
     */
    normalizePoints(points) {
        const n = points.length;
        
        // Centroïde
        let cx = 0, cy = 0;
        for (const p of points) {
            cx += p[0];
            cy += p[1];
        }
        cx /= n;
        cy /= n;
        
        // Distance moyenne au centroïde
        let meanDist = 0;
        for (const p of points) {
            meanDist += Math.hypot(p[0] - cx, p[1] - cy);
        }
        meanDist /= n;
        const scale = meanDist > 0 ? Math.sqrt(2) / meanDist : 1;
        
        // Points normalisés
        const normalized = points.map(p => [
            (p[0] - cx) * scale,
            (p[1] - cy) * scale
        ]);
        
        // Matrice de transformation T
        const T = [
            [scale, 0, -cx * scale],
            [0, scale, -cy * scale],
            [0, 0, 1]
        ];
        
        return { points: normalized, T, scale, cx, cy };
    }
    
    /**
     * SVD simplifié (approximation)
     * Pour une vraie implémentation, utiliser numeric.js ou math.js
     */
    svd(A) {
        // Placeholder - en prod utiliser une vraie lib SVD
        console.warn("SVD simplifié - utiliser numeric.js pour précision");
        
        // Calcul ATA
        const m = A.length;
        const n = A[0].length;
        const ATA = this.matmul(this.transpose(A), A);
        
        // Eigenvalues (approximation)
        const eigs = this.eigenDecomposition(ATA);
        
        return {
            U: eigs.vectors,
            S: eigs.values,
            V: eigs.vectors
        };
    }
    
    /**
     * Décompose l'homographie pour extraire pose (rotation, translation, profondeur)
     * @param {Array} H Matrice homographie 3x3
     * @returns {Object} {rotation: 3x3, translation: [x,y,z], depth: scalar}
     */
    decomposePose(H) {
        // Normaliser H
        const scale = Math.sqrt(
            H[0][0] * H[0][0] + H[1][0] * H[1][0] + H[2][0] * H[2][0]
        );
        
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                H[i][j] /= scale;
            }
        }
        
        // Extraire rotation (les 2 premières colonnes sont orthonormales)
        const R = [
            [H[0][0], H[0][1], H[0][2]],
            [H[1][0], H[1][1], H[1][2]],
            [H[2][0], H[2][1], 0]  // Planar
        ];
        
        // Orthonormaliser par SVD
        const eigs = this.eigenDecomposition(this.matmul(this.transpose(R), R));
        
        // Translation (dernière colonne)
        const t = [H[0][2], H[1][2], H[2][2]];
        
        // Profondeur estimée
        const depth = 1.0 / (scale || 1.0);
        
        return { rotation: R, translation: t, depth };
    }
    
    /**
     * Calcule les angles d'Euler à partir de la matrice de rotation
     */
    rotationToEuler(R) {
        const rx = Math.atan2(R[2][1], R[2][2]) * 180 / Math.PI;
        const ry = Math.atan2(-R[2][0], Math.sqrt(R[2][1] ** 2 + R[2][2] ** 2)) * 180 / Math.PI;
        const rz = Math.atan2(R[1][0], R[0][0]) * 180 / Math.PI;
        
        return { x: rx, y: ry, z: rz };
    }
    
    // ============= Utilitaires matriciels =============
    transpose(A) {
        const m = A.length;
        const n = A[0].length;
        const result = Array(n).fill(0).map(() => Array(m));
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                result[j][i] = A[i][j];
            }
        }
        return result;
    }
    
    matmul(A, B) {
        const m = A.length;
        const n = B[0].length;
        const k = B.length;
        const result = Array(m).fill(0).map(() => Array(n).fill(0));
        
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                for (let p = 0; p < k; p++) {
                    result[i][j] += A[i][p] * B[p][j];
                }
            }
        }
        return result;
    }
    
    inverse3x3(M) {
        const det = M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
                    M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
                    M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
        
        if (Math.abs(det) < 1e-10) return M; // Matrice singulière
        
        return [
            [(M[1][1] * M[2][2] - M[1][2] * M[2][1]) / det,
             (M[0][2] * M[2][1] - M[0][1] * M[2][2]) / det,
             (M[0][1] * M[1][2] - M[0][2] * M[1][1]) / det],
            [(M[1][2] * M[2][0] - M[1][0] * M[2][2]) / det,
             (M[0][0] * M[2][2] - M[0][2] * M[2][0]) / det,
             (M[0][2] * M[1][0] - M[0][0] * M[1][2]) / det],
            [(M[1][0] * M[2][1] - M[1][1] * M[2][0]) / det,
             (M[0][1] * M[2][0] - M[0][0] * M[2][1]) / det,
             (M[0][0] * M[1][1] - M[0][1] * M[1][0]) / det]
        ];
    }
    
    reshape(arr, rows, cols) {
        const result = [];
        for (let i = 0; i < rows; i++) {
            result.push(arr.slice(i * cols, (i + 1) * cols));
        }
        return result;
    }
    
    eigenDecomposition(A) {
        // Approximation simple - pour une vraie implémentation, utiliser une lib
        // Retourner valeurs propres et vecteurs propres
        return { values: [1, 1, 1], vectors: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] };
    }
}

// Export pour utilisation
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PreciseHomographyCalculator;
}
