/**
 * Hook personnalisé pour récupérer les données d'un site web
 * Utilisé pour Site Vitrine 2Thier et Devis1Minute
 */

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface WebSiteConfig {
  id: number;
  websiteId: number;
  logoFileId?: number;
  faviconFileId?: number;
  primaryColor: string;
  secondaryColor: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country: string;
  mapUrl?: string;
  businessHours?: any;
  socialLinks?: any;
  heroTitle?: string;
  heroSubtitle?: string;
  heroCtaPrimary?: string;
  heroCtaSecondary?: string;
  heroBackgroundFileId?: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogImageFileId?: number;
  stats?: any;
  aboutText?: string;
  valuesJson?: any;
  logoFile?: any;
  faviconFile?: any;
  heroBackgroundFile?: any;
  ogImageFile?: any;
}

interface WebSiteService {
  id: number;
  websiteId: number;
  key: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
  ctaText: string;
  ctaUrl?: string;
  imageFileId?: number;
  isActive: boolean;
  displayOrder: number;
}

interface WebSiteProject {
  id: number;
  websiteId: number;
  title: string;
  location: string;
  details: string;
  imageFileId?: number;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
  completedAt?: string;
}

interface WebSiteTestimonial {
  id: number;
  websiteId: number;
  customerName: string;
  location: string;
  service: string;
  rating: number;
  text: string;
  avatarFileId?: number;
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
  publishedAt?: string;
}

interface WebSiteBlogPost {
  id: number;
  websiteId: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageFileId?: number;
  tags: string[];
  authorId?: string;
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt?: string;
  author?: {
    id: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
}

interface WebSiteData {
  id: number;
  organizationId: string;
  siteName: string;
  siteType: string;
  slug: string;
  domain?: string;
  isActive: boolean;
  isPublished: boolean;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  createdAt: string;
  updatedAt: string;
  config?: WebSiteConfig;
  services: WebSiteService[];
  projects: WebSiteProject[];
  testimonials: WebSiteTestimonial[];
  blogPosts: WebSiteBlogPost[];
  mediaFiles: any[];
}

interface UseWebSiteReturn {
  data: WebSiteData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook pour récupérer toutes les données d'un site web
 * @param slug - Le slug du site (ex: "site-vitrine-2thier", "devis1minute")
 */
export const useWebSite = (slug: string): UseWebSiteReturn => {
  const [data, setData] = useState<WebSiteData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWebSite = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/api/websites/${slug}`);
      
      setData(response.data);
    } catch (err: any) {
      console.error('Error fetching website:', err);
      setError(err.response?.data?.error || 'Une erreur est survenue lors du chargement du site');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchWebSite();
    }
  }, [slug]);

  return {
    data,
    loading,
    error,
    refetch: fetchWebSite
  };
};

/**
 * Hook pour récupérer uniquement les services d'un site
 */
export const useWebSiteServices = (slug: string) => {
  const [data, setData] = useState<WebSiteService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/websites/${slug}/services`);
        setData(response.data);
      } catch (err: any) {
        console.error('Error fetching services:', err);
        setError(err.response?.data?.error || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchServices();
    }
  }, [slug]);

  return { data, loading, error };
};

/**
 * Hook pour récupérer uniquement les projets d'un site
 */
export const useWebSiteProjects = (slug: string, featuredOnly = false) => {
  const [data, setData] = useState<WebSiteProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const url = `${API_BASE_URL}/api/websites/${slug}/projects${featuredOnly ? '?featured=true' : ''}`;
        const response = await axios.get(url);
        setData(response.data);
      } catch (err: any) {
        console.error('Error fetching projects:', err);
        setError(err.response?.data?.error || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchProjects();
    }
  }, [slug, featuredOnly]);

  return { data, loading, error };
};

/**
 * Hook pour récupérer uniquement les témoignages d'un site
 */
export const useWebSiteTestimonials = (slug: string, featuredOnly = false) => {
  const [data, setData] = useState<WebSiteTestimonial[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        setLoading(true);
        const url = `${API_BASE_URL}/api/websites/${slug}/testimonials${featuredOnly ? '?featured=true' : ''}`;
        const response = await axios.get(url);
        setData(response.data);
      } catch (err: any) {
        console.error('Error fetching testimonials:', err);
        setError(err.response?.data?.error || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchTestimonials();
    }
  }, [slug, featuredOnly]);

  return { data, loading, error };
};

/**
 * Hook pour récupérer les articles de blog d'un site
 */
export const useWebSiteBlog = (slug: string, limit = 10, featuredOnly = false) => {
  const [data, setData] = useState<WebSiteBlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ limit: limit.toString() });
        if (featuredOnly) params.append('featured', 'true');
        
        const response = await axios.get(`${API_BASE_URL}/api/websites/${slug}/blog?${params}`);
        setData(response.data);
      } catch (err: any) {
        console.error('Error fetching blog:', err);
        setError(err.response?.data?.error || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchBlog();
    }
  }, [slug, limit, featuredOnly]);

  return { data, loading, error };
};
