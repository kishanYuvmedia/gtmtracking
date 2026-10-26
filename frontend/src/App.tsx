import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ScreenMode } from './types';
import { AuthLayout } from './components/screens/AuthLayout';
import { SignInScreen } from './components/screens/SignInScreen';
import { ForgotPasswordScreen } from './components/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from './components/screens/ResetPasswordScreen';
import { SignUpScreen } from './components/screens/SignUpScreen';
import { MailConfirmationScreen } from './components/screens/MailConfirmationScreen';
import { WorkspaceReadyScreen } from './components/screens/WorkspaceReadyScreen';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { DashboardScreen } from './components/dashboard/DashboardScreen';
import { DestinationsScreen } from './components/dashboard/DestinationsScreen';
import { FacebookAdsDetailScreen } from './components/dashboard/FacebookAdsDetailScreen';
import { ConnectFacebookAdsScreen } from './components/dashboard/ConnectFacebookAdsScreen';
import { ConnectedFacebookAdsScreen } from './components/dashboard/ConnectedFacebookAdsScreen';
import { GoogleAdsDetailScreen } from './components/dashboard/GoogleAdsDetailScreen';
import { EventOverviewScreen } from './components/dashboard/EventOverviewScreen';
import { FunnelScreen } from './components/dashboard/FunnelScreen';
import { RetentionScreen } from './components/dashboard/RetentionScreen';
import { CrmConnectScreen } from './components/dashboard/CrmConnectScreen';
import { CrmConfigurationScreen } from './components/dashboard/CrmConfigurationScreen';
import { CrmEventLogsScreen } from './components/dashboard/CrmEventLogsScreen';
import { ManageWebhookScreen } from './components/dashboard/ManageWebhookScreen';
import { HubSpotConnectScreen } from './components/dashboard/HubSpotConnectScreen';
import { ConnectedHubSpotScreen } from './components/dashboard/ConnectedHubSpotScreen';
import { AddDomainScreen } from './components/dashboard/AddDomainScreen';
import { GenerateScriptScreen } from './components/dashboard/GenerateScriptScreen';
import { ServerSetupScreen } from './components/dashboard/ServerSetupScreen';
import { SiteConnectionListScreen } from './components/dashboard/SiteConnectionListScreen';
import { DomainDetailScreen } from './components/dashboard/DomainDetailScreen';
import { SiteSettingsScreen } from './components/dashboard/SiteSettingsScreen';
import { SettingsScreen } from './components/dashboard/SettingsScreen';
import { TeamMembersScreen } from './components/dashboard/TeamMembersScreen';
import { ApiKeysScreen } from './components/dashboard/ApiKeysScreen';
import { UserProfileScreen } from './components/dashboard/UserProfileScreen';
import { ConfirmationModal } from './components/dashboard/ConfirmationModal';
import { SuccessToast } from './components/dashboard/SuccessToast';
import { DashboardPage } from './components/dashboard/DashboardSidebar';
import { api } from './lib/api';
import { WebsiteFilterProvider, useWebsiteFilter } from './lib/websiteFilter';

interface ToastState {
  message: string;
  visible: boolean;
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false });
  const [disconnectTarget, setDisconnectTarget] = useState<string>('');
  const [disconnectSite, setDisconnectSite] = useState<{ id: string; domain?: string } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  // Bumped after a site is disconnected so the Sites list reloads.
  const [sitesVersion, setSitesVersion] = useState(0);
  const { refreshWebsites, selectedWebsiteId, setSelectedWebsiteId } = useWebsiteFilter();

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleDisconnect = (target: string, site?: { id: string; domain?: string }) => {
    setDisconnectTarget(target);
    setDisconnectSite(site || null);
    setShowDisconnectModal(true);
  };

  const confirmDisconnect = async () => {
    if (disconnectTarget === 'site') {
      if (!disconnectSite || disconnecting) return;
      setDisconnecting(true);
      try {
        await api.disconnectWebsite(disconnectSite.id);
        if (selectedWebsiteId === disconnectSite.id) setSelectedWebsiteId('');
        refreshWebsites().catch(() => {});
        setSitesVersion((version) => version + 1);
        showToast(`${disconnectSite.domain || 'Website'} disconnected`);
        setShowDisconnectModal(false);
        navigate('/connections');
      } catch (cause) {
        showToast(cause instanceof Error ? `Could not disconnect: ${cause.message}` : 'Could not disconnect the website');
        setShowDisconnectModal(false);
      } finally {
        setDisconnecting(false);
      }
      return;
    }
    // Other integrations are not wired to a backend yet.
    showToast('Disconnected successfully');
    setShowDisconnectModal(false);
    if (disconnectTarget === 'crm') navigate('/connections/crm');
    if (disconnectTarget === 'destinations') navigate('/destinations');
    if (disconnectTarget === 'site') navigate('/connections');
    if (disconnectTarget === 'google-ads') navigate('/destinations');
    if (disconnectTarget === 'hubspot') navigate('/connections/crm');
  };

  const getActivePage = (): DashboardPage => {
    const path = location.pathname;
    if (path.startsWith('/settings/team')) return 'team-members';
    if (path.startsWith('/settings/api-keys')) return 'api-keys';
    if (path.startsWith('/settings')) return 'settings';
    if (path.startsWith('/analytics/funnels')) return 'funnels';
    if (path.startsWith('/analytics/retention')) return 'retention';
    if (path.startsWith('/analytics')) return 'analytics';
    if (path.startsWith('/dashboard')) return 'dashboard';
    if (path.startsWith('/connections/crm')) return 'crm-connection';
    if (path.startsWith('/connections')) return 'sites';
    if (path.startsWith('/destinations')) return 'destinations';
    return 'dashboard';
  };

  const dashboardProps = {
    onNavigate: (p: DashboardPage) => navigate(getRoutePath(p)),
    onProfile: () => navigate('/profile'),
    onLogout: () => navigate('/signin'),
  };

  return (
    <div className="min-h-screen font-['Inter',sans-serif] transition-colors duration-150 bg-bg text-ink" id="clickowl-app-root">
      <main>
        <Routes>
          <Route path="/signin" element={<AuthLayout currentScreen="signin" onNavigate={(s) => navigate(s === 'dashboard' ? '/app' : `/${s}`)}><SignInScreen onNavigate={(s) => navigate(s === 'dashboard' ? '/app' : `/${s}`)} /></AuthLayout>} />
          <Route path="/signup" element={<AuthLayout currentScreen="signup" onNavigate={(s) => navigate(s === 'dashboard' ? '/app' : `/${s}`)}><SignUpScreen onNavigate={(s) => navigate(s === 'dashboard' ? '/app' : `/${s}`)} /></AuthLayout>} />
          <Route path="/verify" element={<AuthLayout currentScreen="verify" onNavigate={(s) => navigate(s === 'dashboard' ? '/app' : `/${s}`)}><MailConfirmationScreen onNavigate={(s) => navigate(s === 'dashboard' ? '/app' : `/${s}`)} /></AuthLayout>} />
          <Route path="/forgot-password" element={<AuthLayout currentScreen="signin" onNavigate={(s) => navigate(s === 'dashboard' ? '/app' : `/${s}`)}><ForgotPasswordScreen onNavigate={(s) => navigate(s === 'dashboard' ? '/app' : `/${s}`)} /></AuthLayout>} />
          <Route path="/reset-password" element={<AuthLayout currentScreen="signin" onNavigate={(s) => navigate(s === 'dashboard' ? '/app' : `/${s}`)}><ResetPasswordScreen onNavigate={(s) => navigate(s === 'dashboard' ? '/app' : `/${s}`)} /></AuthLayout>} />
          <Route path="/dashboard" element={<Navigate to="/dashboard-page" replace />} />

          <Route path="/app" element={<Navigate to="/dashboard-page" replace />} />

          {/* Dashboard */}
          <Route path="/dashboard-page" element={
            <DashboardLayout activePage="analytics" {...dashboardProps}>
              <EventOverviewScreen />
            </DashboardLayout>
          } />

          {/* Connections - Sites */}
          <Route path="/connections" element={
            <DashboardLayout activePage="sites" {...dashboardProps}>
              <SiteConnectionListScreen
                key={sitesVersion}
                onAddDomain={() => navigate('/connections/add-domain')}
                onSelectSite={(site) => navigate('/connections/site/' + site.id)}
                onOpenSettings={(site) => navigate('/connections/site/' + site.id + '?tab=settings')}
                onDisconnect={(site) => handleDisconnect('site', { id: site.id, domain: site.domain })}
              />
            </DashboardLayout>
          } />
          <Route path="/connections/add-domain" element={
            <DashboardLayout activePage="sites" {...dashboardProps}>
              <AddDomainScreen
                onBack={() => navigate('/connections')}
                onNext={() => navigate(
                  localStorage.getItem('websiteConnectionMethod') === 'local'
                    ? '/connections/generate-script'
                    : '/connections/server-setup'
                )}
              />
            </DashboardLayout>
          } />
          <Route path="/connections/server-setup" element={
            <DashboardLayout activePage="sites" {...dashboardProps}>
              <ServerSetupScreen onBack={() => navigate('/connections')} onNext={() => navigate('/connections/generate-script')} />
            </DashboardLayout>
          } />
          <Route path="/connections/generate-script" element={
            <DashboardLayout activePage="sites" {...dashboardProps}>
              <GenerateScriptScreen
                onBack={() => navigate(
                  localStorage.getItem('websiteConnectionMethod') === 'local'
                    ? '/connections'
                    : '/connections/server-setup'
                )}
                onNext={() => { showToast('Website setup completed'); navigate('/connections'); }}
              />
            </DashboardLayout>
          } />
          <Route path="/connections/site/:id" element={
            <DashboardLayout activePage="sites" {...dashboardProps}>
              <DomainDetailScreenWrapper onDisconnect={(site) => handleDisconnect('site', site)} onBack={() => navigate('/connections')} />
            </DashboardLayout>
          } />
          <Route path="/connections/site/:id/settings" element={
            <DashboardLayout activePage="sites" {...dashboardProps}>
              <SiteSettingsRoute onBack={() => navigate('/connections')} onDisconnect={(site) => handleDisconnect('site', site)} />
            </DashboardLayout>
          } />

          {/* Connections - CRM */}
          <Route path="/connections/crm" element={
            <DashboardLayout activePage="crm-connection" {...dashboardProps}>
              <CrmConfigurationScreen
                onBack={() => navigate('/connections')}
                onManageWebhook={() => navigate('/connections/crm/webhook')}
                onViewLogs={() => navigate('/connections/crm/logs')}
                onDisconnect={() => handleDisconnect('crm')}
              />
            </DashboardLayout>
          } />
          <Route path="/connections/crm/connect" element={
            <DashboardLayout activePage="crm-connection" {...dashboardProps}>
              <CrmConnectScreen onBack={() => navigate('/connections/crm')} onSave={() => { showToast('CRM connected successfully'); navigate('/connections/crm'); }} />
            </DashboardLayout>
          } />
          <Route path="/connections/crm/webhook" element={
            <DashboardLayout activePage="crm-connection" {...dashboardProps}>
              <ManageWebhookScreen onBack={() => navigate('/connections/crm')} />
            </DashboardLayout>
          } />
          <Route path="/connections/crm/logs" element={
            <DashboardLayout activePage="crm-connection" {...dashboardProps}>
              <CrmEventLogsScreen onBack={() => navigate('/connections/crm')} />
            </DashboardLayout>
          } />
          <Route path="/connections/crm/hubspot" element={
            <DashboardLayout activePage="crm-connection" {...dashboardProps}>
              <HubSpotConnectScreen onBack={() => navigate('/connections/crm')} onSave={() => { showToast('HubSpot connected successfully'); navigate('/connections/crm/hubspot/connected'); }} />
            </DashboardLayout>
          } />
          <Route path="/connections/crm/hubspot/connected" element={
            <DashboardLayout activePage="crm-connection" {...dashboardProps}>
              <ConnectedHubSpotScreen onBack={() => navigate('/connections/crm')} onDisconnect={() => handleDisconnect('hubspot')} />
            </DashboardLayout>
          } />

          {/* Analytics */}
          <Route path="/analytics" element={
            <DashboardLayout activePage="analytics" {...dashboardProps}>
              <EventOverviewScreen />
            </DashboardLayout>
          } />
          <Route path="/analytics/logs" element={
            <DashboardLayout activePage="analytics" {...dashboardProps}>
              <EventOverviewScreen initialTab="logs" />
            </DashboardLayout>
          } />
          <Route path="/analytics/users" element={
            <DashboardLayout activePage="analytics" {...dashboardProps}>
              <EventOverviewScreen initialTab="users" />
            </DashboardLayout>
          } />
          <Route path="/analytics/funnels" element={
            <DashboardLayout activePage="funnels" {...dashboardProps}>
              <FunnelScreen />
            </DashboardLayout>
          } />
          <Route path="/analytics/retention" element={
            <DashboardLayout activePage="retention" {...dashboardProps}>
              <RetentionScreen />
            </DashboardLayout>
          } />

          {/* Destinations */}
          <Route path="/destinations" element={
            <DashboardLayout activePage="destinations" {...dashboardProps}>
              <DestinationsScreen
                onSelectDestination={(name) => {
                  if (name === 'Facebook Ads') navigate('/destinations/facebook-ads');
                  if (name === 'Google Ads') navigate('/destinations/google-ads');
                  if (name === 'HubSpot') navigate('/connections/crm/hubspot');
                }}
              />
            </DashboardLayout>
          } />
          <Route path="/destinations/facebook-ads" element={
            <DashboardLayout activePage="destinations" {...dashboardProps}>
              <FacebookAdsDetailScreen onBack={() => navigate('/destinations')} onConnect={() => navigate('/destinations/facebook-ads/connect')} />
            </DashboardLayout>
          } />
          <Route path="/destinations/facebook-ads/connect" element={
            <DashboardLayout activePage="destinations" {...dashboardProps}>
              <ConnectFacebookAdsScreen onBack={() => navigate('/destinations/facebook-ads')} onSave={() => { showToast('Facebook Ads connected'); navigate('/destinations/facebook-ads/connected'); }} />
            </DashboardLayout>
          } />
          <Route path="/destinations/facebook-ads/connected" element={
            <DashboardLayout activePage="destinations" {...dashboardProps}>
              <ConnectedFacebookAdsScreen onBack={() => navigate('/destinations')} onDisconnect={() => handleDisconnect('destinations')} />
            </DashboardLayout>
          } />
          <Route path="/destinations/google-ads" element={
            <DashboardLayout activePage="destinations" {...dashboardProps}>
              <GoogleAdsDetailScreen onBack={() => navigate('/destinations')} onDisconnect={() => handleDisconnect('google-ads')} />
            </DashboardLayout>
          } />

          {/* Settings */}
          <Route path="/settings" element={
            <DashboardLayout activePage="settings" {...dashboardProps}>
              <SettingsScreen />
            </DashboardLayout>
          } />
          <Route path="/settings/team" element={
            <DashboardLayout activePage="team-members" {...dashboardProps}>
              <TeamMembersScreen />
            </DashboardLayout>
          } />
          <Route path="/settings/api-keys" element={
            <DashboardLayout activePage="api-keys" {...dashboardProps}>
              <ApiKeysScreen />
            </DashboardLayout>
          } />

          {/* Profile */}
          <Route path="/profile" element={
            <DashboardLayout activePage="dashboard" {...dashboardProps}>
              <UserProfileScreen onBack={() => navigate('/dashboard-page')} onLogout={() => navigate('/signin')} />
            </DashboardLayout>
          } />

          <Route path="/" element={<Navigate to="/signin" replace />} />
          <Route path="*" element={<Navigate to="/signin" replace />} />
        </Routes>
      </main>

      <ConfirmationModal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onConfirm={confirmDisconnect}
        title={disconnectTarget === 'site' ? 'Disconnect Website' : 'Disconnect Integration'}
        message={disconnectTarget === 'site'
          ? `The pixel on ${disconnectSite?.domain || 'this website'} will stop collecting events and the site is removed from your Sites list. Events already collected stay in your reports. Add the domain again any time to reconnect.`
          : 'Are you sure you want to disconnect? This will stop sending data and you may lose existing configuration.'}
        confirmText={disconnecting ? 'Disconnecting…' : 'Disconnect'}
        cancelText="Cancel"
        variant="danger"
      />

      <SuccessToast message={toast.message} isVisible={toast.visible} onClose={hideToast} />
    </div>
  );
}

function getRoutePath(page: DashboardPage): string {
  switch (page) {
    case 'dashboard': return '/dashboard-page';
    case 'sites': return '/connections';
    case 'crm-connection': return '/connections/crm';
    case 'analytics': return '/analytics';
    case 'funnels': return '/analytics/funnels';
    case 'retention': return '/analytics/retention';
    case 'destinations': return '/destinations';
    case 'settings': return '/settings';
    case 'team-members': return '/settings/team';
    case 'api-keys': return '/settings/api-keys';
    default: return '/dashboard-page';
  }
}

function SiteSettingsRoute({ onDisconnect, onBack }: { onDisconnect: (site: { id: string }) => void; onBack: () => void }) {
  const { id } = useParams();
  return <SiteSettingsScreen onBack={onBack} onDisconnect={() => id && onDisconnect({ id })} />;
}

function DomainDetailScreenWrapper({ onDisconnect, onBack }: { onDisconnect: (site: { id: string; domain: string }) => void; onBack: () => void }) {
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  const [domain, setDomain] = React.useState<{
    id: string;
    name: string;
    domain: string;
    status: string;
    lastSync: string;
    eventsToday: number;
  } | null>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    setDomain(null);
    setError('');
    if (!id) {
      setError('Website ID is missing');
      return;
    }
    api.getWebsites()
      .then((response: { websites: {
        id: string;
        name: string | null;
        domain: string;
        status: string;
        events_24h?: number;
        last_event_at?: string | null;
      }[] }) => {
        if (!Array.isArray(response.websites)) throw new Error('The website list response was invalid');
        const website = response.websites.find((item) => item.id === id);
        if (!website) throw new Error('Website not found');
        if (cancelled) return;
        setDomain({
          id: website.id,
          name: website.name || website.domain,
          domain: website.domain,
          status: website.status,
          lastSync: website.last_event_at ? new Date(website.last_event_at).toLocaleString() : 'No events yet',
          eventsToday: website.events_24h || 0,
        });
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load website details');
      });
    return () => { cancelled = true; };
  }, [id]);

  if (error) return <p role="alert" className="p-4 text-sm text-danger">{error}</p>;
  if (!domain) return <p className="p-4 text-sm text-muted">Loading website...</p>;

  return (
    <DomainDetailScreen
      domain={domain}
      initialTab={searchParams.get('tab') === 'settings' ? 'settings' : 'overview'}
      onBack={onBack}
      onDisconnect={() => onDisconnect({ id: domain.id, domain: domain.domain })}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WebsiteFilterProvider>
        <AppContent />
      </WebsiteFilterProvider>
    </BrowserRouter>
  );
}
