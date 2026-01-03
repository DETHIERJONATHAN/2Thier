/**
 * 🎯 useRealTimeGuidance - Hook pour guide temps réel pendant la capture
 * 
 * Analyse les frames de la caméra en temps réel pour guider l'utilisateur:
 * - "Reculez un peu"
 * - "Centrez la feuille A4"
 * - "Trop sombre"
 * - "✅ Parfait, capturez!"
 */

import { useState, useCallback, useRef } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

export interface GuidanceState {
  canCapture: boolean;
  message: string;
  scores: {
    visibility: number;
    centering: number;
    lighting: number;
    sharpness: number;
    perspective: number;
  };
  issues: string[];
  suggestions: string[];
  isAnalyzing: boolean;
  lastAnalysisTime: number;
}

export interface UseRealTimeGuidanceOptions {
  referenceType: 'a4' | 'card' | 'meter' | 'custom';
  analysisInterval?: number; // Intervalle entre analyses (ms)
  minScoreToCapture?: number; // Score minimum pour autoriser capture
}

export function useRealTimeGuidance(options: UseRealTimeGuidanceOptions) {
  const { referenceType, analysisInterval = 2000, minScoreToCapture = 60 } = options;
  const { api } = useAuthenticatedApi();
  
  const [guidance, setGuidance] = useState<GuidanceState>({
    canCapture: true,
    message: '📷 Prêt à capturer',
    scores: { visibility: 50, centering: 50, lighting: 50, sharpness: 50, perspective: 50 },
    issues: [],
    suggestions: [],
    isAnalyzing: false,
    lastAnalysisTime: 0
  });
  
  const lastAnalysisRef = useRef<number>(0);
  const isAnalyzingRef = useRef<boolean>(false);

  /**
   * Analyser une frame de la caméra
   */
  const analyzeFrame = useCallback(async (imageBase64: string, mimeType: string = 'image/jpeg') => {
    // Throttle: pas plus d'une analyse par intervalle
    const now = Date.now();
    if (now - lastAnalysisRef.current < analysisInterval || isAnalyzingRef.current) {
      return guidance;
    }
    
    lastAnalysisRef.current = now;
    isAnalyzingRef.current = true;
    
    setGuidance(prev => ({ ...prev, isAnalyzing: true }));
    
    try {
      // Nettoyer le base64
      let cleanBase64 = imageBase64;
      if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1];
      }
      
      const response = await api.post('/api/measurement-reference/analyze-frame', {
        imageBase64: cleanBase64,
        mimeType,
        referenceType
      });
      
      // Calculer le score global
      const avgScore = response.scores 
        ? (response.scores.visibility + response.scores.centering + 
           response.scores.lighting + response.scores.sharpness + 
           response.scores.perspective) / 5
        : 50;
      
      const newGuidance: GuidanceState = {
        canCapture: response.canCapture ?? avgScore >= minScoreToCapture,
        message: response.message || (avgScore >= minScoreToCapture ? '✅ Parfait, capturez!' : '⏳ Ajustez la position'),
        scores: response.scores || guidance.scores,
        issues: response.issues || [],
        suggestions: response.suggestions || [],
        isAnalyzing: false,
        lastAnalysisTime: now
      };
      
      setGuidance(newGuidance);
      return newGuidance;
      
    } catch (error) {
      console.error('❌ [RealTimeGuidance] Erreur analyse frame:', error);
      
      // En cas d'erreur, permettre la capture
      const fallbackGuidance: GuidanceState = {
        canCapture: true,
        message: '📷 Capturez quand prêt',
        scores: { visibility: 50, centering: 50, lighting: 50, sharpness: 50, perspective: 50 },
        issues: [],
        suggestions: [],
        isAnalyzing: false,
        lastAnalysisTime: now
      };
      
      setGuidance(fallbackGuidance);
      return fallbackGuidance;
      
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [api, referenceType, analysisInterval, minScoreToCapture, guidance.scores]);

  /**
   * Obtenir une couleur basée sur le score
   */
  const getScoreColor = useCallback((score: number): string => {
    if (score >= 80) return '#52c41a'; // Vert
    if (score >= 60) return '#faad14'; // Orange
    return '#ff4d4f'; // Rouge
  }, []);

  /**
   * Obtenir l'emoji pour le message
   */
  const getMessageIcon = useCallback((canCapture: boolean, avgScore: number): string => {
    if (canCapture && avgScore >= 80) return '✅';
    if (canCapture && avgScore >= 60) return '👍';
    if (avgScore >= 40) return '⚠️';
    return '❌';
  }, []);

  /**
   * Reset le guide
   */
  const resetGuidance = useCallback(() => {
    setGuidance({
      canCapture: true,
      message: '📷 Prêt à capturer',
      scores: { visibility: 50, centering: 50, lighting: 50, sharpness: 50, perspective: 50 },
      issues: [],
      suggestions: [],
      isAnalyzing: false,
      lastAnalysisTime: 0
    });
    lastAnalysisRef.current = 0;
    isAnalyzingRef.current = false;
  }, []);

  return {
    guidance,
    analyzeFrame,
    resetGuidance,
    getScoreColor,
    getMessageIcon
  };
}

export default useRealTimeGuidance;
