import React, { useState } from 'react';
import { UserPlus, MoreHorizontal, Trash2, Shield, Search } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Editor' | 'Viewer';
  status: 'active' | 'invited';
  lastActive: string;
  avatar: string;
}

const members: TeamMember[] = [
  { id: '1', name: 'Dixita S.', email: 'dixita@clickowl.io', role: 'Owner', status: 'active', lastActive: 'Now', avatar: 'DS' },
  { id: '2', name: 'Raj Patel', email: 'raj@clickowl.io', role: 'Admin', status: 'active', lastActive: '2 hr ago', avatar: 'RP' },
  { id: '3', name: 'Priya Sharma', email: 'priya@clickowl.io', role: 'Editor', status: 'active', lastActive: '1 day ago', avatar: 'PS' },
  { id: '4', name: 'Amit Kumar', email: 'amit@partner.com', role: 'Viewer', status: 'invited', lastActive: '—', avatar: 'AK' },
  { id: '5', name: 'Sara Lee', email: 'sara@agency.io', role: 'Editor', status: 'active', lastActive: '3 hr ago', avatar: 'SL' },
];

const roleColors: Record<string, string> = {
  Owner: 'bg-ink text-white',
  Admin: 'bg-info/10 text-info',
  Editor: 'bg-success/10 text-success',
  Viewer: 'bg-bg text-muted',
};

export const TeamMembersScreen: React.FC = () => {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Viewer');
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filtered = members.filter(
    (m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Team Members</h1>
          <p className="text-sm text-muted mt-1.5">Manage who has access to your workspace.</p>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 px-4 py-2 bg-ink text-white text-sm font-medium rounded-md hover:bg-ink/90 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      {showInvite && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-sm font-bold text-ink mb-3">Invite Team Member</h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1 block">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="input"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1 block">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="select"
              >
                <option>Viewer</option>
                <option>Editor</option>
                <option>Admin</option>
              </select>
            </div>
            <button className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-md hover:bg-ink/90 transition-colors">
              Send Invite
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-ink">{members.length} Members</span>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-search w-48"
            />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Member</th>
              <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Role</th>
              <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Status</th>
              <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Last Active</th>
              <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((member) => (
              <tr key={member.id} className="border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center shrink-0">
                      <span className="text-white text-[10px] font-bold">{member.avatar}</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-ink">{member.name}</p>
                      <p className="text-[11px] text-muted">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${roleColors[member.role]}`}>
                    {member.role}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    member.status === 'active' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                  }`}>{member.status}</span>
                </td>
                <td className="px-5 py-3 text-xs text-muted">{member.lastActive}</td>
                <td className="px-5 py-3 text-right">
                  <div className="relative inline-block">
                    <button
                      onClick={() => setOpenMenu(openMenu === member.id ? null : member.id)}
                      className="text-muted hover:text-ink transition-colors p-1"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {openMenu === member.id && (
                      <div className="absolute top-full right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-bg transition-colors">
                          <Shield className="w-3.5 h-3.5 text-muted" />
                          Change Role
                        </button>
                        {member.role !== 'Owner' && (
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-danger hover:bg-danger/5 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
