/**
 * ➕ LeadCreatorModal Amélioré - Modal pour créer un nouveau lead avec tous les champs
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Button,
  Space,
  Typography,
  message as antdMessage,
  Row,
  Col,
  Select,
  Divider,
  DatePicker
} from 'antd';
import { 
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
  HomeOutlined,
  GlobalOutlined,
  IdcardOutlined
} from '@ant-design/icons';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import type { LeadCreatorModalProps, CreateLeadData, TBLLead } from './types/lead-types';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Configuration Google Maps
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
// Libraries doit être stable pour éviter les rechargements inattendus du script Google
const GOOGLE_LIBRARIES: string[] = ['places'];

interface ExtendedCreateLeadData extends CreateLeadData {
  company?: string;
  address?: string;
  addressDetails?: string;
  locality?: string;
  postalCode?: string;
  source?: string;
  website?: string;
  nextFollowUpDate?: string;
  gsm?: string;
  tel?: string;
  tva?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface LeadCreatorModalPropsExtended extends LeadCreatorModalProps {
  onCreateLead: (leadData: ExtendedCreateLeadData) => Promise<void>;
  // 🆕 Mode d'utilisation du modal
  mode?: 'create' | 'edit';
  // 🆕 Valeurs initiales si édition (id requis pour PUT)
  initialLead?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    source?: string | null;
    website?: string | null;
    notes?: string | null;
    nextFollowUpDate?: string | null;
    data?: Record<string, unknown> | null;
    status?: string | null;
    assignedToId?: string | null;
  };
}

const LeadCreatorModalAdvanced: React.FC<LeadCreatorModalPropsExtended> = ({
  open,
  onClose,
  onLeadCreated,
  onCreateLead,
  mode = 'create',
  initialLead
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  type AddressDetails = {
    formatted?: string | null;
    coordinates: { lat: number; lng: number } | null;
    components?: { streetNumber?: string; route?: string; locality?: string; postalCode?: string; country?: string };
  } | null;
  const [addressDetails, setAddressDetails] = useState<AddressDetails>(null);
  const [addressInput, setAddressInput] = useState<string>("");
  // Autocomplete et état pour l'adresse de chantier
  const [siteAutocomplete, setSiteAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [siteAddressDetails, setSiteAddressDetails] = useState<AddressDetails>(null);
  const [addressSiteInput, setAddressSiteInput] = useState<string>("");
  const { api } = useAuthenticatedApi();
  const [msgApi, msgCtx] = antdMessage.useMessage();

  // Charger Google Maps Places une seule fois avec un id stable
  const stableLibraries = useMemo(() => GOOGLE_LIBRARIES, []);
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: stableLibraries
  });

  // 🧩 Pré-remplir le formulaire en mode édition
  React.useEffect(() => {
    if (!open || mode !== 'edit') return;
    const il = initialLead;
    if (!il) return;
    const ilData = (il.data || {}) as Record<string, unknown>;
    const str = (v: unknown): string | undefined => typeof v === 'string' ? v : undefined;
    
    // 🔥 FIX: Gérer l'adresse qui peut être un string OU un objet
    let addressStr: string | undefined;
    let localityStr: string | undefined;
    let postalCodeStr: string | undefined;
    
    const rawAddress = ilData.address;
    if (typeof rawAddress === 'string') {
      // Format ancien: adresse en string simple
      addressStr = rawAddress;
      localityStr = str(ilData.locality) || str(ilData.city);
      postalCodeStr = str(ilData.postalCode) || str(ilData.zipCode);
    } else if (rawAddress && typeof rawAddress === 'object') {
      // Format nouveau: adresse en objet { street, city, zipCode, country }
      const addrObj = rawAddress as Record<string, unknown>;
      const street = str(addrObj.street) || '';
      const city = str(addrObj.city) || str(addrObj.locality) || '';
      const zipCode = str(addrObj.zipCode) || str(addrObj.postalCode) || '';
      const country = str(addrObj.country) || '';
      
      // Construire l'adresse formatée
      addressStr = [street, zipCode, city, country].filter(Boolean).join(', ');
      localityStr = city;
      postalCodeStr = zipCode;
    } else {
      localityStr = str(ilData.locality) || str(ilData.city);
      postalCodeStr = str(ilData.postalCode) || str(ilData.zipCode);
    }
    
    // Préparer valeurs de formulaire à partir du lead initial
    const v: Partial<ExtendedCreateLeadData> = {
      company: str(il.company),
      firstName: str(il.firstName),
      lastName: str(il.lastName),
      email: str(il.email),
      tel: str(il.phone),
      website: str(il.website) || str(ilData.website),
      source: str(il.source),
      nextFollowUpDate: str(il.nextFollowUpDate) || str(ilData.nextFollowUpDate),
      address: addressStr,
      addressDetails: str(ilData.addressDetails),
      locality: localityStr,
      postalCode: postalCodeStr,
      notes: str(il.notes) || str(ilData.notes)
    };
    form.setFieldsValue(v);
    // Inputs contrôlés d'adresse
    setAddressInput((v.address as string) || '');
    setAddressSiteInput((v.addressDetails as string) || '');
  }, [open, mode, initialLead, form]);

  // Fonction pour gérer la sélection d'adresse via Google Maps
  const onPlaceChanged = useCallback(() => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      
      if (place.address_components) {
        const addressComponents = place.address_components;
        
        // Extraire les composants d'adresse
        const getComponent = (type: string) => 
          addressComponents.find(comp => comp.types.includes(type))?.long_name || '';
        
        const streetNumber = getComponent('street_number');
        const route = getComponent('route');
        const locality = getComponent('locality');
        const postalCode = getComponent('postal_code');
        const country = getComponent('country');
        
        // Construire l'adresse complète avec CP et localité
        const fullAddress = place.formatted_address || 
          `${streetNumber} ${route}, ${postalCode} ${locality}, ${country}`.trim();
        
        // Mettre à jour Input + Form avec l'adresse complète
        setAddressInput(fullAddress);
        form.setFieldsValue({ address: fullAddress, locality, postalCode });
        
        // Stocker les coordonnées
        setAddressDetails({
          formatted: place.formatted_address,
          coordinates: place.geometry?.location ? {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          } : null,
          components: {
            streetNumber,
            route,
            locality,
            postalCode,
            country
          }
        });
        
        console.log('🗺️ Adresse sélectionnée:', place.formatted_address);
      }
    }
  }, [autocomplete, form]);

  // Fallback: si l'utilisateur tape sans sélectionner, géocoder à la sortie de champ
  const geocodeTypedAddress = useCallback(() => {
    if (!addressInput || !window.google?.maps?.Geocoder) return;
    const geocoder = new window.google.maps.Geocoder();
    const request: google.maps.GeocoderRequest = {
      address: addressInput,
      // Restriction pays BE pour améliorer la précision
      componentRestrictions: { country: 'BE' }
    };

    geocoder.geocode(request, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        // Choisir le résultat le plus pertinent (privilégie street_address, premise, route)
        const pickBest = (arr: google.maps.GeocoderResult[]) => {
          const hasType = (r: google.maps.GeocoderResult, t: string) => (r.types || []).includes(t);
          return (
            arr.find((r) => hasType(r, 'street_address')) ||
            arr.find((r) => hasType(r, 'premise')) ||
            arr.find((r) => hasType(r, 'route')) ||
            arr.find((r) => (r.address_components || []).some((c) => c.types.includes('postal_code'))) ||
            arr[0]
          );
        };
        const r = pickBest(results);
        const comps = r.address_components || [];
        const getC = (t: string) => comps.find((c) => c.types.includes(t))?.long_name || '';
        const streetNumber = getC('street_number');
        const route = getC('route');
        const locality = getC('locality');
        const postalCode = getC('postal_code');
        const country = getC('country');
        const formatted = r.formatted_address || `${streetNumber} ${route}, ${postalCode} ${locality}, ${country}`.trim();

        setAddressInput(formatted);
        form.setFieldsValue({ address: formatted, locality, postalCode });
        setAddressDetails({
          formatted,
          coordinates: r.geometry?.location ? { lat: r.geometry.location.lat(), lng: r.geometry.location.lng() } : null,
          components: { streetNumber, route, locality, postalCode, country }
        });
        console.log('🗺️ (fallback geocode) Adresse normalisée:', formatted);
      }
    });
  }, [addressInput, form]);

  // Gestion sélection d'adresse du chantier
  const onSitePlaceChanged = useCallback(() => {
    if (siteAutocomplete) {
      const place = siteAutocomplete.getPlace();
      if (place.address_components) {
        const comps = place.address_components;
        const getC = (t: string) => comps.find((c) => c.types.includes(t))?.long_name || '';
        const streetNumber = getC('street_number');
        const route = getC('route');
        const locality = getC('locality');
        const postalCode = getC('postal_code');
        const country = getC('country');
        const fullAddress = place.formatted_address || `${streetNumber} ${route}, ${postalCode} ${locality}, ${country}`.trim();

        setAddressSiteInput(fullAddress);
        form.setFieldsValue({ addressDetails: fullAddress, siteLocality: locality, sitePostalCode: postalCode });
        setSiteAddressDetails({
          formatted: place.formatted_address,
          coordinates: place.geometry?.location ? { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() } : null,
          components: { streetNumber, route, locality, postalCode, country }
        });
        console.log('🗺️ (chantier) Adresse sélectionnée:', place.formatted_address);
      }
    }
  }, [siteAutocomplete, form]);

  // Fallback géocodage pour l'adresse de chantier tapée sans sélection
  const geocodeSiteTypedAddress = useCallback(() => {
    if (!addressSiteInput || !window.google?.maps?.Geocoder) return;
    const geocoder = new window.google.maps.Geocoder();
    // Si on a des coordonnées de l'adresse principale, biaiser la recherche autour de celles-ci
    let bounds: google.maps.LatLngBounds | undefined;
    const center = addressDetails?.coordinates;
    if (center && window.google?.maps?.LatLngBounds) {
      const delta = 0.2; // ~20km de biais autour de l'adresse principale
      bounds = new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(center.lat - delta, center.lng - delta),
        new window.google.maps.LatLng(center.lat + delta, center.lng + delta)
      );
    }

    const request: google.maps.GeocoderRequest = {
      address: addressSiteInput,
      componentRestrictions: { country: 'BE' },
      bounds
    };

    geocoder.geocode(request, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        // Choisir le résultat le plus pertinent (éviter les résultats génériques pays/région)
        const pickBest = (arr: google.maps.GeocoderResult[]) => {
          const hasType = (r: google.maps.GeocoderResult, t: string) => (r.types || []).includes(t);
          // Eviter les résultats country/administrative_area_level_1 si possible
          const filtered = arr.filter(
            (r) => !(hasType(r, 'country') || hasType(r, 'administrative_area_level_1'))
          );
          return (
            filtered.find((r) => hasType(r, 'street_address')) ||
            filtered.find((r) => hasType(r, 'premise')) ||
            filtered.find((r) => hasType(r, 'route')) ||
            filtered.find((r) => (r.address_components || []).some((c) => c.types.includes('postal_code'))) ||
            filtered[0] || arr[0]
          );
        };
        const r = pickBest(results);
        const comps = r.address_components || [];
        const getC = (t: string) => comps.find((c) => c.types.includes(t))?.long_name || '';
        const streetNumber = getC('street_number');
        const route = getC('route');
        const locality = getC('locality');
        const postalCode = getC('postal_code');
        const country = getC('country');
        const formatted = r.formatted_address || `${streetNumber} ${route}, ${postalCode} ${locality}, ${country}`.trim();

        setAddressSiteInput(formatted);
        form.setFieldsValue({ addressDetails: formatted, siteLocality: locality, sitePostalCode: postalCode });
        setSiteAddressDetails({
          formatted,
          coordinates: r.geometry?.location ? { lat: r.geometry.location.lat(), lng: r.geometry.location.lng() } : null,
          components: { streetNumber, route, locality, postalCode, country }
        });
        console.log('🗺️ (fallback geocode chantier) Adresse normalisée:', formatted);
      }
    });
  }, [addressSiteInput, form, addressDetails?.coordinates]);

  const handleSubmit = async (values: ExtendedCreateLeadData) => {
    try {
      setLoading(true);
      
      // Préparer les données avec les informations d'adresse enrichies
      const sameAsMain = (values.addressDetails || '').trim().toLowerCase() === (values.address || '').trim().toLowerCase();
      const leadData = {
        ...values,
        coordinates: addressDetails?.coordinates,
        data: {
          address: values.address,
          addressDetails: values.addressDetails,
          locality: values.locality,
          postalCode: values.postalCode,
          website: values.website,
          nextFollowUpDate: values.nextFollowUpDate,
          country: addressDetails?.components?.country,
          coordinates: addressDetails?.coordinates,
          projectType: 'Installation photovoltaïque', // Valeur par défaut
          source: values.source || 'tbl-formulaire'
        }
      };
      
      console.log('📝 Création lead avec données:', leadData);
      
      if (mode === 'edit' && initialLead?.id) {
        // 🔁 Mise à jour du lead existant
        const payload = {
          status: initialLead.status || undefined,
          source: values.source || initialLead.source || 'tbl-formulaire',
          assignedToId: initialLead.assignedToId || undefined,
          data: {
            ...(initialLead.data || {}),
            ...leadData.data,
            // Champs chantier si différents
            siteAddress: !sameAsMain && values.addressDetails ? values.addressDetails : undefined,
            siteLocality: !sameAsMain ? ((form.getFieldValue('siteLocality') as string) || undefined) : undefined,
            sitePostalCode: !sameAsMain ? ((form.getFieldValue('sitePostalCode') as string) || undefined) : undefined,
            siteCoordinates: !sameAsMain ? (siteAddressDetails?.coordinates || undefined) : undefined,
            // Champs contact à conserver dans data pour compatibilité backend
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.tel || values.gsm,
            company: values.company,
            notes: values.notes || ''
          }
        };
        const resp = await api.put(`/api/leads/${initialLead.id}`, payload);
        if (resp?.success !== false) {
          msgApi.success('Lead modifié avec succès');
          // Notifier parent
          onLeadCreated?.({
            id: initialLead.id,
            name: `${values.firstName || ''} ${values.lastName || ''}`.trim(),
            email: values.email || '',
            phone: values.tel || values.gsm || '',
            company: values.company || '',
            hasSubmission: false
          } as TBLLead);
          // Reset et close
          form.resetFields();
          setAddressDetails(null);
          setSiteAddressDetails(null);
          setAddressInput("");
          setAddressSiteInput("");
          onClose();
        } else {
          throw new Error('Erreur lors de la modification du lead');
        }
      } else {
        // ➕ Création du lead via l'API
        const response = await api.post('/api/leads', {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.tel || values.gsm,
          company: values.company,
          notes: values.notes || '',
          status: 'nouveau',
          source: values.source || 'tbl-formulaire',
          data: {
            ...leadData.data,
            // Champs chantier: seulement si renseigné et différent de l'adresse principale
            siteAddress: !sameAsMain && values.addressDetails ? values.addressDetails : undefined,
            siteLocality: !sameAsMain ? ((form.getFieldValue('siteLocality') as string) || undefined) : undefined,
            sitePostalCode: !sameAsMain ? ((form.getFieldValue('sitePostalCode') as string) || undefined) : undefined,
            siteCoordinates: !sameAsMain ? (siteAddressDetails?.coordinates || undefined) : undefined
          }
        });

        if (response.id || (response.success && response.data)) {
          const newLeadId = response.id || response.data.id;
          const leadName = `${values.firstName} ${values.lastName}`.trim();
          
          // Transformer en TBLLead
          const newLead: TBLLead = {
            id: newLeadId,
            name: leadName,
            email: values.email,
            phone: values.tel || values.gsm || '',
            company: values.company || '',
            hasSubmission: false
          };

          // Appeler la fonction de création pour gérer la soumission TBL
          await onCreateLead(leadData);
          
          msgApi.success(`Lead "${leadName}" créé avec succès ! 🎉`);
          onLeadCreated(newLead);
          form.resetFields();
          setAddressDetails(null);
          setSiteAddressDetails(null);
          setAddressInput("");
          setAddressSiteInput("");
        } else {
          throw new Error('Erreur lors de la création du lead');
        }
      }
    } catch (err: unknown) {
      const errorMessage = (err as Error)?.message || 'Erreur lors de la création du lead';
      console.error('❌ Erreur création lead:', err);
  msgApi.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setAddressDetails(null);
    setSiteAddressDetails(null);
    setAddressInput("");
    setAddressSiteInput("");
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          <span>{mode === 'edit' ? 'Modifier le lead' : 'Créer un nouveau lead'}</span>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={800}
      destroyOnHidden
    >
      {msgCtx}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        scrollToFirstError
      >
        {/* Section Entreprise */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="company"
              label="Entreprise"
            >
              <Input
                prefix={<BankOutlined />}
                placeholder="Nom de l'entreprise (optionnel)"
                maxLength={100}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Section Contact */}
        <Divider orientation="left">
          <Text strong>
            <UserOutlined /> Informations de contact
          </Text>
        </Divider>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="firstName"
              label={<span><Text type="danger">*</Text> Prénom</span>}
              rules={[
                { required: true, message: 'Ce champ est obligatoire' },
                { min: 2, message: 'Le prénom doit contenir au moins 2 caractères' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Saisissez prénom"
                maxLength={50}
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              name="lastName"
              label={<span><Text type="danger">*</Text> Nom</span>}
              rules={[
                { required: true, message: 'Ce champ est obligatoire' },
                { min: 2, message: 'Le nom doit contenir au moins 2 caractères' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Saisissez nom"
                maxLength={50}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Section Adresse */}
        <Divider orientation="left">
          <Text strong>
            <HomeOutlined /> Adresse
          </Text>
        </Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="address"
              label={<span><Text type="danger">*</Text> Adresse</span>}
              rules={[
                { required: true, message: 'Ce champ est obligatoire' }
              ]}
            >
              {GOOGLE_MAPS_API_KEY && isLoaded && !loadError ? (
                <Autocomplete
                  onLoad={setAutocomplete}
                  onPlaceChanged={onPlaceChanged}
                  options={{
                    types: ['address'],
                    componentRestrictions: { country: 'be' },
                    fields: ['address_components', 'geometry', 'formatted_address']
                  }}
                >
                  <Input
                    value={addressInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAddressInput(v);
                      form.setFieldValue('address', v);
                    }}
                    onBlur={geocodeTypedAddress}
                    prefix={<HomeOutlined />}
                    placeholder="Saisissez adresse"
                    maxLength={200}
                  />
                </Autocomplete>
              ) : (
                <Input
                  value={addressInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAddressInput(v);
                    form.setFieldValue('address', v);
                  }}
                  onBlur={geocodeTypedAddress}
                  prefix={<HomeOutlined />}
                  placeholder={loadError ? 'Saisissez adresse (Google indisponible)' : 'Saisissez adresse'}
                  maxLength={200}
                />
              )}
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              name="addressDetails"
              label="Adresses du chantier"
              tooltip="Laisser vide si identique à l'adresse principale"
            >
              {GOOGLE_MAPS_API_KEY && isLoaded && !loadError ? (
                <Autocomplete
                  onLoad={setSiteAutocomplete}
                  onPlaceChanged={onSitePlaceChanged}
                  options={{
                    types: ['address'],
                    componentRestrictions: { country: 'be' },
                    fields: ['address_components', 'geometry', 'formatted_address']
                  }}
                >
                  <Input
                    value={addressSiteInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAddressSiteInput(v);
                      form.setFieldValue('addressDetails', v);
                    }}
                    onBlur={geocodeSiteTypedAddress}
                    prefix={<GlobalOutlined />}
                    placeholder="Laisser vide si identique à l'adresse principale"
                    maxLength={200}
                  />
                </Autocomplete>
              ) : (
                <Input
                  value={addressSiteInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAddressSiteInput(v);
                    form.setFieldValue('addressDetails', v);
                  }}
                  onBlur={geocodeSiteTypedAddress}
                  prefix={<GlobalOutlined />}
                  placeholder={loadError ? "Laisser vide si identique (Google indisponible)" : "Laisser vide si identique à l'adresse principale"}
                  maxLength={200}
                />
              )}
            </Form.Item>
          </Col>
        </Row>

        {/* Section Détails commerciaux (source / site / suivi) */}
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="source" label="Source">
              <Select allowClear placeholder="Sélectionnez la source">
                <Option value="manual">Ajout manuel</Option>
                <Option value="website">Site web</Option>
                <Option value="referral">Recommandation</Option>
                <Option value="linkedin">LinkedIn</Option>
                <Option value="email">Email</Option>
                <Option value="phone">Téléphone</Option>
                <Option value="other">Autre</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="website" label="Site web">
              <Input prefix={<GlobalOutlined />} placeholder="Site web de l'entreprise" maxLength={120} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="nextFollowUpDate" label="Prochain suivi">
              <DatePicker className="w-full" format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
        </Row>

        {/* Section Contact */}
        <Divider orientation="left">
          <Text strong>
            <PhoneOutlined /> Contact
          </Text>
        </Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="tel"
              label={<span><Text type="danger">*</Text> Tel</span>}
              rules={[
                { required: true, message: 'Ce champ est obligatoire' }
              ]}
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="Saisissez tel"
                maxLength={20}
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              name="gsm"
              label="GSM"
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="Saisissez gsm"
                maxLength={20}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { type: 'email', message: 'Format email invalide' }
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="email@exemple.com"
                maxLength={100}
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              name="tva"
              label="Numéro TVA"
            >
              <Input
                prefix={<IdcardOutlined />}
                placeholder="Saisissez numéro tva"
                maxLength={50}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Section Notes */}
        <Form.Item
          name="notes"
          label="Notes"
        >
          <TextArea
            rows={3}
            placeholder="Ajoutez des notes sur ce lead..."
            maxLength={500}
          />
        </Form.Item>

        {/* Actions */}
        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel}>
              Annuler
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<UserOutlined />}
            >
              {mode === 'edit' ? 'Enregistrer les modifications' : 'Créer le lead'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LeadCreatorModalAdvanced;