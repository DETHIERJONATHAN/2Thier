import { useAuth } from '../../auth/useAuth';

export default function OrganizationSwitcher() {
  const { 
    organizations, 
    currentOrganization,
    selectOrganization, 
    loading,
    isSuperAdmin
  } = useAuth();

  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newOrgId = e.target.value;
    selectOrganization(newOrgId || null);
  };

  if (loading) {
    return <div>Chargement des organisations...</div>;
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="mb-4">
      <label htmlFor="org-switcher" className="block text-sm font-medium text-gray-700 mb-1">
        Organisation
      </label>
      <select
        id="org-switcher"
        value={currentOrganization?.id || ''}
        onChange={handleOrgChange}
        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
      >
        <option value="">Toutes les organisations</option>
        {organizations.map(org => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </div>
  );
}
