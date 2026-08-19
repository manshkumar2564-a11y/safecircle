import { useState } from 'react';
import { supabase, type Contact } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { Plus, Trash2, Star, Phone, Mail, User, X, Users } from 'lucide-react';

type Props = {
  contacts: Contact[];
  onContactsChanged: () => void;
};

const RELATIONSHIPS = ['Mom', 'Dad', 'Partner', 'Sibling', 'Roommate', 'Friend', 'Spouse', 'Other'];

export default function ContactsView({ contacts, onContactsChanged }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const { showToast } = useToast();

  async function deleteContact(id: string) {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) {
      showToast('error', 'Failed to delete contact');
      return;
    }
    showToast('success', 'Contact removed');
    onContactsChanged();
  }

  async function togglePrimary(contact: Contact) {
    const { error } = await supabase
      .from('contacts')
      .update({ is_primary: !contact.is_primary })
      .eq('id', contact.id);
    if (error) {
      showToast('error', 'Failed to update contact');
      return;
    }
    onContactsChanged();
  }

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Trusted Contacts</h1>
          <p className="text-sm text-stone-500 mt-1">
            These people receive your SOS alerts and check-in notifications.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-stone-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-stone-800 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Add
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-stone-200 p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-stone-400" />
          </div>
          <h3 className="font-semibold text-stone-700 mb-1">No contacts yet</h3>
          <p className="text-sm text-stone-400 mb-4">
            Add 2–3 trusted people who will receive your safety alerts.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 bg-stone-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-stone-800 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Add Contact
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="group bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/70 shadow-sm flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-stone-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-stone-900 truncate">{c.name}</h3>
                  {c.is_primary && (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3 fill-amber-500 stroke-amber-500" />
                      Primary
                    </span>
                  )}
                </div>
                <p className="text-sm text-stone-500">{c.relationship}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-stone-400">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {c.phone}
                  </span>
                  {c.email && (
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3" />
                      {c.email}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => togglePrimary(c)}
                  title={c.is_primary ? 'Remove primary' : 'Mark as primary'}
                  className={`p-2 rounded-lg transition-colors ${
                    c.is_primary
                      ? 'text-amber-500 hover:bg-amber-50'
                      : 'text-stone-300 hover:text-amber-500 hover:bg-amber-50'
                  }`}
                >
                  <Star className={`w-4 h-4 ${c.is_primary ? 'fill-amber-500' : ''}`} />
                </button>
                <button
                  onClick={() => deleteContact(c.id)}
                  title="Delete"
                  className="p-2 rounded-lg text-stone-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddContactModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            onContactsChanged();
          }}
        />
      )}
    </div>
  );
}

function AddContactModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState(RELATIONSHIPS[0]);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || saving) return;
    setSaving(true);
    const { error } = await supabase.from('contacts').insert({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      relationship,
    });
    setSaving(false);
    if (error) {
      showToast('error', 'Failed to add contact');
      return;
    }
    showToast('success', `${name.trim()} added to trusted contacts`);
    onSaved();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-sm p-0 sm:p-4 animate-[fadeIn_150ms_ease-out]"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-[slideUp_200ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
          <h2 className="text-lg font-bold text-stone-900">Add Contact</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mom"
              autoFocus
              maxLength={50}
              className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Phone number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Relationship
            </label>
            <div className="flex gap-2 flex-wrap">
              {RELATIONSHIPS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRelationship(r)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    relationship === r
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={!name.trim() || !phone.trim() || saving}
            className="w-full bg-stone-900 text-white font-semibold py-3.5 rounded-xl hover:bg-stone-800 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Adding…' : 'Add Contact'}
          </button>
        </form>
      </div>
    </div>
  );
}
