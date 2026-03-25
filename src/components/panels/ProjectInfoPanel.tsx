import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Pencil,
  Phone,
  Mail,
  MessageSquare,
  Plus,
  Building2,
  ChevronRight,
  User,
} from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import type { Contact } from '@/types/contact';
import type { ProjectStatus } from '@/types/project';

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'survey', label: 'Survey' },
  { value: 'design', label: 'Design' },
  { value: 'review', label: 'Review' },
  { value: 'complete', label: 'Complete' },
];

function statusColor(status: ProjectStatus): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-700';
    case 'survey':
      return 'bg-blue-100 text-blue-700';
    case 'design':
      return 'bg-purple-100 text-purple-700';
    case 'review':
      return 'bg-yellow-100 text-yellow-700';
    case 'complete':
      return 'bg-green-100 text-green-700';
  }
}

interface ProjectInfoPanelProps {
  onAddBuilding?: () => void;
}

export function ProjectInfoPanel({ onAddBuilding }: ProjectInfoPanelProps) {
  const { currentProject, updateCurrentProject, deleteProject, setActiveBuilding } =
    useProjectStore();
  const { setViewMode } = useEditorStore();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Edit form state
  const [name, setName] = useState('');
  const [customer, setCustomer] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('draft');
  const [contacts, setContacts] = useState<Contact[]>([]);

  if (!currentProject) return null;

  const startEdit = () => {
    setName(currentProject.name);
    setCustomer(currentProject.customer);
    setStatus(currentProject.status);
    setContacts(currentProject.contacts.map((c) => ({ ...c })));
    setEditing(true);
    setConfirmDelete(false);
  };

  const cancelEdit = () => {
    setEditing(false);
    setConfirmDelete(false);
  };

  const saveEdit = async () => {
    await updateCurrentProject({ name, customer, status, contacts });
    setEditing(false);
  };

  const addContact = () => {
    setContacts([...contacts, { id: uuidv4(), name: '', phone: '', email: '', role: '' }]);
  };

  const updateContact = (index: number, changes: Partial<Contact>) => {
    setContacts(contacts.map((c, i) => (i === index ? { ...c, ...changes } : c)));
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteProject(currentProject.id);
  };

  const handleBuildingClick = (buildingId: string) => {
    setActiveBuilding(buildingId);
    setViewMode('building');
  };

  // ---- Edit Mode ----
  if (editing) {
    return (
      <div className="space-y-4 text-sm">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Project Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Customer</label>
          <input
            type="text"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Contacts editing */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium">Contacts</span>
            <button
              onClick={addContact}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="space-y-3">
            {contacts.map((contact, i) => (
              <div key={contact.id} className="border border-gray-200 rounded p-2 space-y-1.5">
                <input
                  type="text"
                  value={contact.name}
                  onChange={(e) => updateContact(i, { name: e.target.value })}
                  placeholder="Name"
                  className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={contact.role}
                  onChange={(e) => updateContact(i, { role: e.target.value })}
                  placeholder="Role"
                  className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => updateContact(i, { phone: e.target.value })}
                  placeholder="Phone"
                  className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) => updateContact(i, { email: e.target.value })}
                  placeholder="Email"
                  className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={() => removeContact(i)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Delete project */}
        <div className="pt-2 border-t border-gray-200">
          <button
            onClick={handleDelete}
            className={`text-xs ${
              confirmDelete
                ? 'text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded'
                : 'text-red-500 hover:text-red-700'
            }`}
          >
            {confirmDelete ? 'Confirm Delete Project' : 'Delete Project'}
          </button>
        </div>

        {/* Save / Cancel */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={saveEdit}
            className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={cancelEdit}
            className="flex-1 border border-gray-300 text-xs py-1.5 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ---- View Mode ----
  return (
    <div className="space-y-4 text-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{currentProject.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{currentProject.customer}</p>
        </div>
        <button
          onClick={startEdit}
          className="p-1.5 hover:bg-gray-100 rounded"
          title="Edit project"
        >
          <Pencil className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Status badge */}
      <span
        className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(currentProject.status)}`}
      >
        {currentProject.status.charAt(0).toUpperCase() + currentProject.status.slice(1)}
      </span>

      {/* Contacts */}
      <div>
        <h4 className="text-xs text-gray-500 font-medium mb-2">Contacts</h4>
        {currentProject.contacts.length === 0 ? (
          <p className="text-xs text-gray-400">No contacts yet</p>
        ) : (
          <div className="space-y-2">
            {currentProject.contacts.map((contact) => (
              <div key={contact.id} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{contact.name}</p>
                  {contact.role && (
                    <p className="text-[11px] text-gray-400 truncate">{contact.role}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {contact.phone && (
                    <>
                      <a
                        href={`tel:${contact.phone}`}
                        className="p-1 hover:bg-gray-100 rounded"
                        title={`Call ${contact.phone}`}
                      >
                        <Phone className="w-3.5 h-3.5 text-gray-500" />
                      </a>
                      <a
                        href={`sms:${contact.phone}`}
                        className="p-1 hover:bg-gray-100 rounded"
                        title={`SMS ${contact.phone}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                      </a>
                    </>
                  )}
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="p-1 hover:bg-gray-100 rounded"
                      title={`Email ${contact.email}`}
                    >
                      <Mail className="w-3.5 h-3.5 text-gray-500" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buildings */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs text-gray-500 font-medium">Buildings</h4>
          {onAddBuilding && (
            <button
              onClick={onAddBuilding}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-3 h-3" /> Add Building
            </button>
          )}
        </div>
        {currentProject.buildings.length === 0 ? (
          <p className="text-xs text-gray-400">No buildings yet</p>
        ) : (
          <div className="space-y-1">
            {currentProject.buildings.map((building) => (
              <button
                key={building.id}
                onClick={() => handleBuildingClick(building.id)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-50 text-left group"
              >
                <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {building.name || 'Unnamed Building'}
                  </p>
                  {building.address && (
                    <p className="text-[11px] text-gray-400 truncate">{building.address}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
