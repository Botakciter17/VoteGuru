import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BarChart3,
  Users,
  FolderKanban,
  Image as ImageIcon,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Download,
  RefreshCw,
  X,
  Archive,
  Power,
  ExternalLink,
  Trophy,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { api, getAdminToken, getAdminUser, setAdminSession } from '../api/client';
import { TruBrandLogo, BentoStatCard, CategoryGlyph } from '../components/TruBrandLogo';
import PosterGenerator from '../components/PosterGenerator';

const ICON_OPTIONS = [
  { id: 'sparkles', label: 'Sparkles' },
  { id: 'smile', label: 'Smile' },
  { id: 'heart', label: 'Heart' },
  { id: 'shield', label: 'Shield' },
  { id: 'lightbulb', label: 'Lightbulb' },
  { id: 'trophy', label: 'Trophy' },
  { id: 'award', label: 'Award' },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [adminUser] = useState(() => getAdminUser());
  const [activeSection, setActiveSection] = useState('stats');
  const [chartType, setChartType] = useState('bar');
  const [posterCatId, setPosterCatId] = useState(null);
  const [stats, setStats] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const [teacherModal, setTeacherModal] = useState(null);
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    subject: '',
    bio: '',
    is_active: true,
    category_ids: [],
    photoFile: null,
  });
  const [savingTeacher, setSavingTeacher] = useState(false);

  const [categoryModal, setCategoryModal] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: 'award',
    is_active: true,
    starts_at: '',
    ends_at: '',
    teacher_ids: [],
  });
  const [savingCategory, setSavingCategory] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [periodLabel, setPeriodLabel] = useState('Semester Ganjil 2026/2027');
  const [archiveBeforeReset, setArchiveBeforeReset] = useState(true);
  const [resetting, setResetting] = useState(false);

  const showToast = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback((p) => (p?.text === text ? null : p)), 4500);
  };

  const loadAllAdminData = async () => {
    if (!getAdminToken()) {
      navigate('/admin/login');
      return;
    }
    setLoading(true);
    try {
      const [s, t, c] = await Promise.all([
        api.adminGetStats(),
        api.adminGetTeachers(true),
        api.adminGetCategories(),
      ]);
      setStats(s.data);
      setTeachers(t.data || []);
      setCategories(c.data || []);
    } catch (err) {
      if (err.status === 401) navigate('/admin/login');
      else showToast(err.message || 'Gagal memuat data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const handleLogout = async () => {
    try {
      await api.adminLogout();
    } catch {
      // ignore
    }
    setAdminSession(null, null);
    navigate('/admin/login');
  };

  const openCreateTeacher = () => {
    setTeacherModal({ mode: 'create' });
    setTeacherForm({
      name: '',
      subject: '',
      bio: '',
      is_active: true,
      category_ids: categories.map((c) => c.id),
      photoFile: null,
    });
  };

  const openEditTeacher = (t) => {
    setTeacherModal({ mode: 'edit', id: t.id });
    setTeacherForm({
      name: t.name,
      subject: t.subject,
      bio: t.bio || '',
      is_active: Boolean(t.is_active),
      category_ids: (t.categories || []).map((c) => c.id),
      photoFile: null,
    });
  };

  const handleSaveTeacher = async (e) => {
    e.preventDefault();
    setSavingTeacher(true);
    try {
      const fd = new FormData();
      fd.append('name', teacherForm.name);
      fd.append('subject', teacherForm.subject);
      fd.append('bio', teacherForm.bio);
      fd.append('is_active', teacherForm.is_active ? '1' : '0');
      teacherForm.category_ids.forEach((id) => fd.append('category_ids[]', id));
      if (teacherForm.photoFile) fd.append('photo', teacherForm.photoFile);
      if (teacherModal.mode === 'create') {
        await api.adminCreateTeacher(fd);
        showToast('Guru berhasil ditambahkan.');
      } else {
        await api.adminUpdateTeacher(teacherModal.id, fd);
        showToast('Data guru diperbarui.');
      }
      setTeacherModal(null);
      loadAllAdminData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingTeacher(false);
    }
  };

  const handleDeleteTeacher = async (t) => {
    if (!window.confirm(`Arsipkan guru "${t.name}"?`)) return;
    try {
      const r = await api.adminDeleteTeacher(t.id);
      showToast(r.message);
      loadAllAdminData();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleRestoreTeacher = async (t) => {
    try {
      const r = await api.adminRestoreTeacher(t.id);
      showToast(r.message);
      loadAllAdminData();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const fmtDtl = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  const openCreateCategory = () => {
    setCategoryModal({ mode: 'create' });
    setCategoryForm({
      name: '',
      description: '',
      icon: 'sparkles',
      is_active: true,
      starts_at: '',
      ends_at: '',
      teacher_ids: teachers.filter((t) => !t.deleted_at && t.is_active).map((t) => t.id),
    });
  };

  const openEditCategory = (c) => {
    setCategoryModal({ mode: 'edit', id: c.id });
    setCategoryForm({
      name: c.name,
      description: c.description || '',
      icon: c.icon || 'award',
      is_active: Boolean(c.is_active),
      starts_at: fmtDtl(c.starts_at),
      ends_at: fmtDtl(c.ends_at),
      teacher_ids: (c.teachers || []).map((t) => t.id),
    });
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setSavingCategory(true);
    try {
      const payload = {
        ...categoryForm,
        starts_at: categoryForm.starts_at || null,
        ends_at: categoryForm.ends_at || null,
      };
      if (categoryModal.mode === 'create') {
        await api.adminCreateCategory(payload);
        showToast('Kategori dibuat.');
      } else {
        await api.adminUpdateCategory(categoryModal.id, payload);
        showToast('Kategori diperbarui.');
      }
      setCategoryModal(null);
      loadAllAdminData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleToggleCategory = async (c) => {
    try {
      const r = await api.adminToggleCategory(c.id);
      showToast(r.message);
      loadAllAdminData();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleDeleteCategory = async (c) => {
    if (!window.confirm(`Hapus kategori "${c.name}"?`)) return;
    try {
      const r = await api.adminDeleteCategory(c.id);
      showToast(r.message);
      loadAllAdminData();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleResetVotes = async (e) => {
    e.preventDefault();
    setResetting(true);
    try {
      const r = await api.adminResetVotes({
        period_label: periodLabel,
        archive_before_reset: archiveBeforeReset,
      });
      showToast(r.message);
      setShowResetModal(false);
      loadAllAdminData();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-20 relative">
      {/* Ornamen Geometris Merah Solid di Belakang Glass Card */}
      <svg
        viewBox="0 0 1200 800"
        fill="none"
        preserveAspectRatio="none"
        className="fixed inset-0 w-full h-full pointer-events-none opacity-80 z-0"
      >
        <polygon points="0,140 680,460 0,720" fill="#E11D23" fillOpacity="0.18" />
        <circle
          cx="1020"
          cy="220"
          r="160"
          stroke="#E11D23"
          strokeOpacity="0.3"
          strokeWidth="1.5"
        />
      </svg>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 relative z-10">
        {/* Header Glass */}
        <header className="glass-card rounded-2xl px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <TruBrandLogo size="md" showText={false} />
            <div>
              <span className="text-[11px] font-bold text-[#A3A3A3] block">
                Dashboard Admin • {adminUser?.email || 'Panitia'}
              </span>
              <h1 className="text-lg font-extrabold text-white">
                MANAJEMEN <span className="text-[#E11D23]">VOTING GURU</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#E11D23]" /> Halaman Publik
            </Link>
            <button
              type="button"
              onClick={loadAllAdminData}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E11D23] hover:bg-[#c8181e] text-white text-xs font-bold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Keluar
            </button>
          </div>
        </header>

        {feedback && (
          <div className="mt-4 rounded-xl px-5 py-3.5 text-xs sm:text-sm font-bold flex items-center justify-between bg-[#E11D23] text-white">
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="ml-4 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Nav tabs */}
        <nav className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 glass-card p-1.5 rounded-2xl overflow-x-auto no-scrollbar">
            {[
              { id: 'stats', label: 'Statistik', icon: BarChart3 },
              { id: 'teachers', label: `Guru (${teachers.length})`, icon: Users },
              { id: 'categories', label: `Kategori (${categories.length})`, icon: FolderKanban },
              { id: 'poster', label: 'Poster PNG', icon: ImageIcon },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  activeSection === id
                    ? 'bg-[#E11D23] text-white'
                    : 'text-[#BDBDBD] hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => api.adminDownloadCsv()}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl glass-card glass-card-hover text-white text-xs font-extrabold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#E11D23]" /> Ekspor CSV
            </button>
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E11D23] hover:bg-[#c8181e] text-white text-xs font-extrabold cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" /> Arsip / Reset
            </button>
          </div>
        </nav>

        {/* STATS SECTION */}
        {activeSection === 'stats' && stats && (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <BentoStatCard
                value={stats.summary.total_votes}
                suffix="Suara"
                label="Total Suara Masuk"
                sublabel={`${stats.summary.unique_voters} pemilih unik`}
                highlight
              />
              <BentoStatCard
                value={stats.summary.unique_voters}
                suffix="Pemilih"
                label="Partisipan Unik"
                sublabel={`${stats.summary.unique_ips} IP tercatat`}
              />
              <BentoStatCard
                value={stats.summary.active_categories}
                suffix={`/${stats.summary.total_categories}`}
                label="Kategori Aktif"
                sublabel="Dapat dibuka/tutup manual"
              />
              <BentoStatCard
                value={stats.summary.total_teachers}
                suffix="Guru"
                label="Kandidat Terdaftar"
                sublabel="Dilengkapi soft-delete"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8 glass-card rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#E11D23]">
                      Tren Harian
                    </span>
                    <h3 className="text-lg font-extrabold text-white">
                      Suara Masuk 7 Hari Terakhir
                    </h3>
                  </div>
                  <div className="inline-flex rounded-xl bg-white/5 p-1 border border-white/15">
                    {['bar', 'line'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setChartType(t)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer ${
                          chartType === t ? 'bg-[#E11D23] text-white' : 'text-[#A3A3A3]'
                        }`}
                      >
                        {t === 'bar' ? 'Batang' : 'Garis'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                      <BarChart data={stats.daily_votes}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="label" tick={{ fill: '#BDBDBD', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#BDBDBD', fontSize: 12 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1E1E1E',
                            color: '#fff',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.25)',
                          }}
                        />
                        <Bar dataKey="votes" name="Suara" fill="#E11D23" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    ) : (
                      <LineChart data={stats.daily_votes}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="label" tick={{ fill: '#BDBDBD', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#BDBDBD', fontSize: 12 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1E1E1E',
                            color: '#fff',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.25)',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="votes"
                          name="Suara"
                          stroke="#E11D23"
                          strokeWidth={3}
                          dot={{ r: 5, fill: '#FFFFFF', stroke: '#E11D23', strokeWidth: 2 }}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-4 glass-card rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#E11D23]">
                    Top Akumulasi
                  </span>
                  <h3 className="text-lg font-extrabold text-white mt-0.5">
                    Guru Terpopuler
                  </h3>
                  <div className="mt-4 space-y-2.5">
                    {(stats.top_teachers_overall || []).slice(0, 5).map((t, i) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-3 bg-white/5 border border-white/15 rounded-xl p-2.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-[#E11D23] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                            #{i + 1}
                          </span>
                          <img
                            src={t.photo_url}
                            alt={t.name}
                            className="w-10 h-10 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-white truncate">
                              {t.name}
                            </h4>
                            <p className="text-[11px] text-[#A3A3A3] truncate">
                              {t.subject}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-[#E11D23] shrink-0 px-2">
                          {t.total_votes}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-[#8C8C8C] mt-4 pt-3 border-t border-white/10">
                  Hasil hanya dapat dilihat oleh admin.
                </p>
              </div>
            </div>

            {/* Per-category stats */}
            <div>
              <h3 className="text-xl font-extrabold text-white mb-4">
                Perolehan Suara per <span className="text-[#E11D23]">Kategori</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {(stats.categories || []).map((cat) => (
                  <div key={cat.category_id} className="glass-card rounded-2xl p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#E11D23] text-white flex items-center justify-center shrink-0">
                          <CategoryGlyph icon={cat.icon} className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-base font-extrabold text-white">
                            {cat.category_name}
                          </h4>
                          <span className="text-xs font-semibold text-[#A3A3A3]">
                            Total: <strong className="text-white">{cat.total_votes} suara</strong>
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPosterCatId(cat.category_id);
                          setActiveSection('poster');
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E11D23] hover:bg-[#c8181e] text-white text-xs font-extrabold shrink-0 cursor-pointer"
                      >
                        <Trophy className="w-3.5 h-3.5" /> Poster
                      </button>
                    </div>
                    <div className="mt-5 space-y-3">
                      {(cat.standings || []).map((st, i) => (
                        <div key={st.teacher_id}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-5 h-5 rounded-md text-[11px] font-extrabold flex items-center justify-center shrink-0 ${
                                  i === 0
                                    ? 'bg-[#E11D23] text-white'
                                    : 'bg-white/10 text-white'
                                }`}
                              >
                                {i + 1}
                              </span>
                              <span className="font-extrabold text-white truncate">
                                {st.name}
                              </span>
                            </div>
                            <span className="font-extrabold text-[#BDBDBD] shrink-0">
                              {st.votes} ({st.percentage}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                i === 0 ? 'bg-[#E11D23]' : 'bg-white/50'
                              }`}
                              style={{ width: `${Math.max(st.percentage, 3)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TEACHERS SECTION */}
        {activeSection === 'teachers' && (
          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-xl font-extrabold text-white">Daftar Guru</h2>
                <p className="text-xs text-[#A3A3A3]">
                  Upload foto otomatis resize. Menghapus guru memakai soft-delete.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateTeacher}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E11D23] text-white text-xs font-extrabold cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Tambah Guru
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {teachers.map((t) => {
                const trashed = Boolean(t.deleted_at);
                return (
                  <div
                    key={t.id}
                    className={`glass-card rounded-2xl p-4 flex flex-col justify-between ${
                      trashed ? 'opacity-50' : ''
                    }`}
                  >
                    <div>
                      <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-[#1E1E1E] border border-white/15">
                        <img
                          src={t.photo_url}
                          alt={t.name}
                          className="w-full h-full object-cover"
                        />
                        <span
                          className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            trashed
                              ? 'bg-amber-600 text-white'
                              : t.is_active
                              ? 'bg-[#E11D23] text-white'
                              : 'bg-white/20 text-white'
                          }`}
                        >
                          {trashed ? 'Diarsipkan' : t.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <div className="mt-3">
                        <span className="text-[11px] font-bold text-[#E11D23]">
                          {t.subject}
                        </span>
                        <h3 className="text-base font-extrabold text-white mt-0.5">
                          {t.name}
                        </h3>
                        {t.bio && (
                          <p className="text-xs text-[#A3A3A3] mt-1 line-clamp-2">
                            {t.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-white">
                        {t.votes_count || 0} Suara
                      </span>
                      <div className="flex items-center gap-1.5">
                        {trashed ? (
                          <button
                            type="button"
                            onClick={() => handleRestoreTeacher(t)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#E11D23] text-white text-xs font-bold cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Pulihkan
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditTeacher(t)}
                              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#E11D23] text-white flex items-center justify-center cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTeacher(t)}
                              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CATEGORIES SECTION */}
        {activeSection === 'categories' && (
          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h2 className="text-xl font-extrabold text-white">Kategori & Nominasi</h2>
              <button
                type="button"
                onClick={openCreateCategory}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E11D23] text-white text-xs font-extrabold cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Tambah Kategori
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="glass-card rounded-2xl p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                            cat.is_active
                              ? 'bg-[#E11D23] text-white'
                              : 'bg-white/10 text-[#A3A3A3]'
                          }`}
                        >
                          <CategoryGlyph icon={cat.icon} className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-extrabold text-white">
                              {cat.name}
                            </h3>
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                                cat.voting_status === 'open'
                                  ? 'bg-[#E11D23] text-white'
                                  : 'bg-white/15 text-[#BDBDBD]'
                              }`}
                            >
                              {cat.voting_status === 'open' ? 'Buka' : 'Tutup'}
                            </span>
                          </div>
                          <p className="text-xs text-[#A3A3A3] mt-1">{cat.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/15">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#A3A3A3] block mb-2">
                        Nominasi ({(cat.teachers || []).length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(cat.teachers || []).map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-white text-xs font-bold"
                          >
                            <img
                              src={t.photo_url}
                              alt={t.name}
                              className="w-4 h-4 rounded-full object-cover"
                            />
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleCategory(cat)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-extrabold cursor-pointer"
                    >
                      <Power className="w-3.5 h-3.5 text-[#E11D23]" />
                      {cat.is_active ? 'Tutup Voting' : 'Buka Voting'}
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditCategory(cat)}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-[#E11D23] text-white text-xs font-extrabold cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        className="w-8 h-8 rounded-xl bg-white/10 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* POSTER SECTION */}
        {activeSection === 'poster' && stats && (
          <div className="mt-6">
            <PosterGenerator
              categories={stats.categories || []}
              initialCategoryId={posterCatId}
            />
          </div>
        )}
      </div>

      {/* Teacher Modal */}
      {teacherModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card rounded-3xl max-w-lg w-full p-6 my-8 bg-[#1A1A1A]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-white">
                {teacherModal.mode === 'create' ? 'Tambah Guru' : 'Edit Guru'}
              </h3>
              <button
                type="button"
                onClick={() => setTeacherModal(null)}
                className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveTeacher} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-[#BDBDBD] mb-1">
                  Nama *
                </label>
                <input
                  type="text"
                  required
                  value={teacherForm.name}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/25 text-white text-sm font-bold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-[#BDBDBD] mb-1">
                  Mata Pelajaran *
                </label>
                <input
                  type="text"
                  required
                  value={teacherForm.subject}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, subject: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/25 text-white text-sm font-bold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-[#BDBDBD] mb-1">
                  Bio
                </label>
                <textarea
                  rows={2}
                  value={teacherForm.bio}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, bio: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/25 text-white text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-[#BDBDBD] mb-1">
                  Foto (JPG/PNG/WEBP)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) =>
                    setTeacherForm({
                      ...teacherForm,
                      photoFile: e.target.files?.[0] || null,
                    })
                  }
                  className="w-full text-xs text-white file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-[#E11D23] file:text-white file:font-extrabold"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-[#BDBDBD] mb-1.5">
                  Nominasi di Kategori:
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/15">
                  {categories.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2.5 text-xs font-bold text-white cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={teacherForm.category_ids.includes(c.id)}
                        onChange={() => {
                          const next = teacherForm.category_ids.includes(c.id)
                            ? teacherForm.category_ids.filter((i) => i !== c.id)
                            : [...teacherForm.category_ids, c.id];
                          setTeacherForm({ ...teacherForm, category_ids: next });
                        }}
                        className="accent-[#E11D23]"
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2.5 text-xs font-extrabold text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={teacherForm.is_active}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, is_active: e.target.checked })
                  }
                  className="accent-[#E11D23]"
                />
                Aktif
              </label>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTeacherModal(null)}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white text-xs font-extrabold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingTeacher}
                  className="flex-1 py-3 rounded-xl bg-[#E11D23] text-white text-xs font-extrabold cursor-pointer"
                >
                  {savingTeacher ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {categoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card rounded-3xl max-w-lg w-full p-6 my-8 bg-[#1A1A1A]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-white">
                {categoryModal.mode === 'create' ? 'Tambah Kategori' : 'Edit Kategori'}
              </h3>
              <button
                type="button"
                onClick={() => setCategoryModal(null)}
                className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-[#BDBDBD] mb-1">
                  Nama *
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/25 text-white text-sm font-bold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-[#BDBDBD] mb-1">
                  Deskripsi
                </label>
                <textarea
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, description: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/25 text-white text-xs outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-[#BDBDBD] mb-1">
                    Ikon
                  </label>
                  <select
                    value={categoryForm.icon}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, icon: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E1E1E] border border-white/25 text-white text-xs font-bold outline-none"
                  >
                    {ICON_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-xs font-extrabold text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={categoryForm.is_active}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, is_active: e.target.checked })
                      }
                      className="accent-[#E11D23]"
                    />
                    Voting Aktif
                  </label>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold text-[#BDBDBD]">
                    Guru Nominasi ({categoryForm.teacher_ids.length})
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setCategoryForm({
                        ...categoryForm,
                        teacher_ids: teachers
                          .filter((t) => !t.deleted_at)
                          .map((t) => t.id),
                      })
                    }
                    className="text-[11px] font-bold text-[#E11D23] hover:underline cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                </div>
                <div className="max-h-44 overflow-y-auto space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/15">
                  {teachers
                    .filter((t) => !t.deleted_at)
                    .map((t) => (
                      <label
                        key={t.id}
                        className="flex items-center justify-between gap-2 text-xs font-bold text-white cursor-pointer py-1"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={categoryForm.teacher_ids.includes(t.id)}
                            onChange={() => {
                              const next = categoryForm.teacher_ids.includes(t.id)
                                ? categoryForm.teacher_ids.filter((i) => i !== t.id)
                                : [...categoryForm.teacher_ids, t.id];
                              setCategoryForm({ ...categoryForm, teacher_ids: next });
                            }}
                            className="accent-[#E11D23]"
                          />
                          {t.name}
                        </span>
                        <span className="text-[11px] text-[#A3A3A3]">{t.subject}</span>
                      </label>
                    ))}
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCategoryModal(null)}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white text-xs font-extrabold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="flex-1 py-3 rounded-xl bg-[#E11D23] text-white text-xs font-extrabold cursor-pointer"
                >
                  {savingCategory ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl max-w-md w-full p-6 bg-[#1A1A1A]">
            <h3 className="text-lg font-extrabold text-white">Arsip & Reset Periode</h3>
            <form onSubmit={handleResetVotes} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-[#BDBDBD] mb-1">
                  Label Periode *
                </label>
                <input
                  type="text"
                  required
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/25 text-white text-xs font-bold"
                />
              </div>
              <label className="flex items-center gap-2.5 text-xs font-extrabold text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={archiveBeforeReset}
                  onChange={(e) => setArchiveBeforeReset(e.target.checked)}
                  className="accent-[#E11D23]"
                />
                Simpan ke arsip sebelum reset
              </label>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white text-xs font-extrabold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 py-3 rounded-xl bg-[#E11D23] text-white text-xs font-extrabold cursor-pointer"
                >
                  {resetting ? 'Memproses...' : 'Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
