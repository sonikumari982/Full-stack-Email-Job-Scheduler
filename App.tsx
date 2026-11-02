import { useEffect, useMemo, useState } from 'react';

type User = {
  name: string;
  email: string;
  picture?: string;
};

type EmailRecord = {
  id: number;
  recipient: string;
  subject: string;
  status: string;
  scheduled_for: string;
  sent_at?: string;
  created_at?: string;
  body?: string;
};

const API_BASE = 'http://localhost:4000/api';

function parseUserFromToken(token: string | null): User | null {
  if (!token) return null;
  try {
    const raw = atob(token);
    const parsed = JSON.parse(raw) as User;
    return parsed;
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledEmails, setScheduledEmails] = useState<EmailRecord[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    sender: 'hello@reachinbox.ai',
    subject: '',
    body: '',
    recipients: '',
    startTime: new Date(Date.now() + 60_000).toISOString().slice(0, 16),
    delayBetweenMs: '2000',
    hourlyLimit: '200',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    setUser(parseUserFromToken(token));
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [scheduled, sent] = await Promise.all([
        fetch(`${API_BASE}/emails/scheduled`).then((res) => res.json()),
        fetch(`${API_BASE}/emails/sent`).then((res) => res.json()),
      ]);
      setScheduledEmails(scheduled);
      setSentEmails(sent);
    } catch {
      setError('Unable to load inbox data right now.');
    } finally {
      setLoading(false);
    }
  };

  const totalCount = useMemo(
    () => (activeTab === 'scheduled' ? scheduledEmails.length : sentEmails.length),
    [activeTab, scheduledEmails.length, sentEmails.length],
  );

  const handleSchedule = async () => {
    setError('');
    setMessage('');

    const payload = {
      sender: form.sender,
      subject: form.subject,
      body: form.body,
      csv: form.recipients,
      startTime: new Date(form.startTime).toISOString(),
      delayBetweenMs: Number(form.delayBetweenMs),
      hourlyLimit: Number(form.hourlyLimit),
    };

    try {
      const response = await fetch(`${API_BASE}/emails/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Schedule failed');
      }

      setMessage(`Scheduled ${data.count} email(s) successfully.`);
      setShowModal(false);
      setForm({
        sender: 'hello@reachinbox.ai',
        subject: '',
        body: '',
        recipients: '',
        startTime: new Date(Date.now() + 60_000).toISOString().slice(0, 16),
        delayBetweenMs: '2000',
        hourlyLimit: '200',
      });
      loadDashboardData();
    } catch (err: any) {
      setError(err.message || 'Unable to schedule email.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/google`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Google auth is not configured');
      }
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || 'Unable to start Google login.');
    }
  };

  const handleSlackConnect = async () => {
    const webhook = window.prompt('Paste a Slack incoming webhook URL');
    if (!webhook) return;

    try {
      const response = await fetch(`${API_BASE}/slack/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: webhook }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to connect Slack');
      setMessage('Slack connected successfully.');
    } catch (err: any) {
      setError(err.message || 'Slack connection failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">ReachInbox</div>
            <h1 className="text-2xl font-bold">Email Scheduler</h1>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="h-10 w-10 rounded-full border border-slate-200" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700">
                  {user.name?.charAt(0) ?? 'U'}
                </div>
              )}
              <div className="text-right">
                <div className="font-semibold">{user.name}</div>
                <div className="text-xs text-slate-500">{user.email}</div>
              </div>
              <button
                onClick={() => setUser(null)}
                className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleLogin}
              className="rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-glow hover:bg-primary-700"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-2 rounded-full bg-slate-200 p-1">
            <button
              className={`rounded-full px-5 py-2 text-sm font-medium ${activeTab === 'scheduled' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}
              onClick={() => setActiveTab('scheduled')}
            >
              Scheduled Emails
            </button>
            <button
              className={`rounded-full px-5 py-2 text-sm font-medium ${activeTab === 'sent' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}
              onClick={() => setActiveTab('sent')}
            >
              Sent Emails
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSlackConnect}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Connect Slack
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="rounded-full bg-primary-600 px-5 py-2 text-sm font-medium text-white shadow-glow hover:bg-primary-700"
            >
              Compose New Email
            </button>
          </div>
        </div>

        {message ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold">
                {activeTab === 'scheduled' ? 'Scheduled Emails' : 'Sent Emails'}
              </h2>
              <p className="text-sm text-slate-500">{totalCount} records</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="px-6 py-16 text-center text-slate-500">Loading...</div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-slate-600">Email</th>
                    <th className="px-6 py-3 text-left font-medium text-slate-600">Subject</th>
                    <th className="px-6 py-3 text-left font-medium text-slate-600">{activeTab === 'scheduled' ? 'Scheduled time' : 'Sent time'}</th>
                    <th className="px-6 py-3 text-left font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(activeTab === 'scheduled' ? scheduledEmails : sentEmails).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center text-slate-500">
                        No {activeTab === 'scheduled' ? 'scheduled' : 'sent'} emails found.
                      </td>
                    </tr>
                  ) : (
                    (activeTab === 'scheduled' ? scheduledEmails : sentEmails).map((email) => (
                      <tr key={email.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-700">{email.recipient}</td>
                        <td className="px-6 py-4 text-slate-700">{email.subject}</td>
                        <td className="px-6 py-4 text-slate-500">
                          {activeTab === 'scheduled'
                            ? email.scheduled_for
                            : email.sent_at || email.created_at || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              email.status === 'sent'
                                ? 'bg-emerald-100 text-emerald-700'
                                : email.status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {email.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Compose New Email</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-700">Close</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-medium text-slate-600">From</span>
                <input
                  value={form.sender}
                  onChange={(e) => setForm({ ...form, sender: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-primary-500"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-medium text-slate-600">Subject</span>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-primary-500"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-medium text-slate-600">Lead recipients (CSV / newline separated)</span>
                <textarea
                  rows={4}
                  value={form.recipients}
                  onChange={(e) => setForm({ ...form, recipients: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-primary-500"
                  placeholder="mike@example.com, jane@example.com"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-600">Start time</span>
                <input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-primary-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-600">Delay between emails (ms)</span>
                <input
                  type="number"
                  value={form.delayBetweenMs}
                  onChange={(e) => setForm({ ...form, delayBetweenMs: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-primary-500"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-medium text-slate-600">Hourly limit</span>
                <input
                  type="number"
                  value={form.hourlyLimit}
                  onChange={(e) => setForm({ ...form, hourlyLimit: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-primary-500"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-medium text-slate-600">Email body</span>
                <textarea
                  rows={5}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-primary-500"
                  placeholder="Hello, this is a personalized outreach message..."
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedule}
                className="rounded-full bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
