import React, { lazy, Suspense } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Spin } from 'antd';

// SettingsPage (layout with sidebar + Outlet)
const SettingsPage = lazy(() => import('./SettingsPage'));

// Settings sub-pages
const ProfileSettings = lazy(() => import('./settings/ProfileSettings'));
const CommercialSettings = lazy(() => import('./settings/CommercialSettings'));
const OrganizationSettings = lazy(() => import('./settings/OrganizationSettings'));
const UsersSettings = lazy(() => import('./settings/UsersSettings'));
const RolesSettings = lazy(() => import('./settings/RolesSettings'));
const EmailSettings = lazy(() => import('./settings/EmailSettings'));
const GoogleSettings = lazy(() => import('./settings/GoogleSettings'));
const AIMeasureSettings = lazy(() => import('./settings/AIMeasureSettings'));
const BlockedSettings = lazy(() => import('./settings/BlockedSettings'));

// Admin sub-pages embedded in settings
const ModulesAdminPage = lazy(() => import('./admin/ModulesAdminPage'));
const PermissionsAdminPage = lazy(() => import('./admin/PermissionsAdminPageNew'));
const UserRightsSummaryPage = lazy(() => import('./admin/UserRightsSummaryPage'));
const OrganizationsAdminPage = lazy(() => import('./admin/OrganizationsAdminPageNew'));
const TreesAdminPage = lazy(() => import('./admin/TreesAdminPage'));
const DocumentTemplatesPage = lazy(() => import('./DocumentTemplatesPage'));
const IntegrationsAdminPage = lazy(() => import('./admin/IntegrationsAdminPage'));
const ZhiiveMailAdminPage = lazy(() => import('./admin/ZhiiveMailAdminPage'));

/**
 * Wraps SettingsPage in an isolated MemoryRouter so its
 * NavLink, Outlet, and useLocation work correctly when embedded
 * inside the dashboard wall (where the real URL is /dashboard?module=/settings).
 */
const SettingsPageEmbedded: React.FC = () => {
  return (
    <MemoryRouter initialEntries={['/settings']}>
      <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />}>
            <Route path="profile" element={<ProfileSettings />} />
            <Route path="commercial" element={<CommercialSettings />} />
            <Route path="organization" element={<OrganizationSettings />} />
            <Route path="users" element={<UsersSettings />} />
            <Route path="roles" element={<RolesSettings />} />
            <Route path="emails" element={<EmailSettings />} />
            <Route path="google" element={<GoogleSettings />} />
            <Route path="ai-measure" element={<AIMeasureSettings />} />
            <Route path="blocked" element={<BlockedSettings />} />
            <Route path="modules" element={<ModulesAdminPage />} />
            <Route path="permissions" element={<PermissionsAdminPage />} />
            <Route path="rights-summary" element={<UserRightsSummaryPage />} />
            <Route path="organizations" element={<OrganizationsAdminPage />} />
            <Route path="trees" element={<TreesAdminPage />} />
            <Route path="documents" element={<DocumentTemplatesPage />} />
            <Route path="integrations" element={<IntegrationsAdminPage />} />
            <Route path="zhiivemail" element={<ZhiiveMailAdminPage />} />
          </Route>
        </Routes>
      </Suspense>
    </MemoryRouter>
  );
};

export default SettingsPageEmbedded;
