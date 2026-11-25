import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  Pencil,
} from 'lucide-react';
import { api } from '../api/client';
import { getOrCreateVoterToken } from '../utils/voterToken';
import { CategoryGlyph } from '../components/TruBrandLogo';

function GeometricBackdrop() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <svg
        viewBox="0 0 430 932"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
      >
        <polygon points="0,120 390,420 0,660" fill="#E11D23" fillOpacity="0.24" />
        <polygon points="80,390 430,590 30,780" fill="#E11D23" fillOpacity="0.16" />
        <circle
          cx="350"
          cy="210"
          r="90"
          stroke="#E11D23"
          strokeOpacity="0.38"
          strokeWidth="1.5"
        />
        <circle cx="295" cy="260" r="20" fill="#E11D23" fillOpacity="0.3" />
      </svg>
    </div>
  );
}

function splitCategoryTitle(name = '') {
  const words = name.trim().split(/\s+/);
  if (words.length <= 2) {
    return { top: words[0] || 'Kategori', bottom: words.slice(1).join(' ') || 'Terbaik' };
  }
  return {
    top: words.slice(0, 2).join(' '),
    bottom: words.slice(2).join(' '),
  };
}

export default function PublicVotingPage() {
  const [categories, setCategories] = useState([]);
  const [myVotesMap, setMyVotesMap] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [captchaChecked, setCaptchaChecked] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [reviewMode, setReviewMode] = useState(false);

  const voterToken = useMemo(() => getOrCreateVoterToken(), []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [catRes, votesRes] = await Promise.all([
        api.getCategories(),
        api.getMyVotes(),
      ]);

      const allCats = catRes?.data || [];
      const activeCats = allCats.filter((c) => c.voting_status === 'open');
      const displayCats = activeCats.length > 0 ? activeCats : allCats;
      setCategories(displayCats);

      const map = {};
      (votesRes?.data || []).forEach((v) => {
        map[v.category_id] = v;
      });
      setMyVotesMap(map);

      const firstUnvotedIdx = displayCats.findIndex((c) => !map[c.id]);
      if (firstUnvotedIdx !== -1) {
        setCurrentIndex(firstUnvotedIdx);
      } else {
        setCurrentIndex(0);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data pemilihan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalCategories = categories.length;
  const votedCount = useMemo(
    () => categories.filter((c) => Boolean(myVotesMap[c.id])).length,
    [categories, myVotesMap]
  );
  const allCompleted = totalCategories > 0 && votedCount === totalCategories;
  const currentCategory = categories[currentIndex] || null;
  const currentVote = currentCategory ? myVotesMap[currentCategory.id] : null;

  useEffect(() => {
    setSelectedTeacher(null);
    setCaptchaChecked(true);
    setSubmitError('');
  }, [currentIndex]);

  const handleSelectTeacherCard = (teacher) => {
    if (!currentCategory || currentCategory.voting_status !== 'open') {
      return;
    }
    if (currentVote && currentVote.teacher_id === teacher.id) {
      setSelectedTeacher(null);
      return;
    }
    setSelectedTeacher((prev) => (prev?.id === teacher.id ? null : teacher));
    setCaptchaChecked(true);
    setSubmitError('');
  };

  const handleCancelVote = async (categoryIdToCancel) => {
    const targetCatId = categoryIdToCancel || currentCategory?.id;
    if (!targetCatId) return;

    setCanceling(true);
    setSubmitError('');
    try {
      await api.cancelVote(targetCatId);
      setMyVotesMap((prev) => {
        const next = { ...prev };
        delete next[targetCatId];
        return next;
      });
      setSelectedTeacher(null);
      setToastMessage('Pilihan dibatalkan. Silakan pilih guru kembali.');
      setTimeout(() => setToastMessage(''), 2400);
    } catch (err) {
      setSubmitError(err.message || 'Gagal membatalkan pilihan.');
    } finally {
      setCanceling(false);
    }
  };

  const handleSubmitAndNext = async (e) => {
    if (e) e.preventDefault();
    if (!currentCategory || !selectedTeacher) return;

    if (!captchaChecked) {
      setSubmitError('Harap centang verifikasi terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    const wasChangingVote = Boolean(currentVote);

    try {
      const res = await api.submitVote({
        category_id: currentCategory.id,
        teacher_id: selectedTeacher.id,
        captcha_verified: true,
        captcha_token: 'verified-' + Date.now() + '-' + voterToken.slice(0, 8),
      });

      const updatedVotes = {
        ...myVotesMap,
        [currentCategory.id]: res.data,
      };
      setMyVotesMap(updatedVotes);
      setSelectedTeacher(null);

      let nextIdx = -1;
      for (let i = 1; i <= categories.length; i++) {
        const candidateIdx = (currentIndex + i) % categories.length;
        const cat = categories[candidateIdx];
        if (!updatedVotes[cat.id] && cat.voting_status === 'open') {
          nextIdx = candidateIdx;
          break;
        }
      }

      if (nextIdx !== -1) {
        setToastMessage(
          wasChangingVote
            ? `Pilihan diubah! Lanjut ke Kategori ${nextIdx + 1}`
            : `Tersimpan! Lanjut ke Kategori ${nextIdx + 1}`
        );
        setCurrentIndex(nextIdx);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => setToastMessage(''), 2200);
      } else if (wasChangingVote && reviewMode) {
        setToastMessage(`Pilihan berhasil diubah menjadi ${res.data.teacher_name}!`);
        setTimeout(() => setToastMessage(''), 2400);
      } else {
        setReviewMode(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setSubmitError(err.message || 'Gagal menyimpan pilihan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#121212] text-white flex flex-col items-center justify-center p-6 relative">
        <GeometricBackdrop />
        <div className="w-11 h-11 rounded-xl bg-[#E11D23] text-white flex items-center justify-center animate-spin relative z-10">
          <RefreshCw className="w-5 h-5" />
        </div>
        <p className="mt-3 text-xs font-bold uppercase tracking-widest text-[#A3A3A3] relative z-10">
          Memuat Kandidat...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-[#121212] text-white flex items-center justify-center p-4 relative">
        <GeometricBackdrop />
        <div className="glass-card rounded-2xl p-6 max-w-sm w-full text-center relative z-10">
          <AlertCircle className="w-10 h-10 text-[#E11D23] mx-auto" />
          <h2 className="text-sm font-bold text-white mt-3">{error}</h2>
          <button
            type="button"
            onClick={loadData}
            className="mt-4 w-full py-3 rounded-xl bg-[#E11D23] text-white text-xs font-extrabold cursor-pointer"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  if (totalCategories === 0) {
    return (
      <div className="min-h-[100dvh] bg-[#121212] text-white flex items-center justify-center p-4 relative">
        <GeometricBackdrop />
        <div className="glass-card rounded-3xl p-7 max-w-sm w-full text-center relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-[#E11D23] text-white flex items-center justify-center mx-auto">
            <CategoryGlyph icon="award" className="w-6 h-6" />
          </div>
          <span className="inline-block mt-4 px-3 py-1 rounded-full bg-white/10 text-[#E11D23] text-[11px] font-extrabold uppercase tracking-wider">
            Pemilihan Guru Terbaik
          </span>
          <h1 className="text-xl font-extrabold text-white mt-2">
            Belum Ada Kategori Aktif
          </h1>
          <p className="text-xs text-[#BDBDBD] mt-1.5 leading-relaxed">
            Panitia sedang menyiapkan data kategori dan nominasi guru. Silakan kembali beberapa saat lagi.
          </p>
          <button
            type="button"
            onClick={loadData}
            className="mt-5 w-full py-3 rounded-xl bg-[#E11D23] hover:bg-[#c8181e] text-white text-xs font-extrabold cursor-pointer"
          >
            Segarkan Halaman
          </button>
        </div>
      </div>
    );
  }

  // LAYAR SELESAI (RINGKASAN PILIHAN DENGAN TOMBOL UBAH & BATAL YANG TIDAK SALING MENUTUPI DI IPHONE)
  if (allCompleted && !reviewMode) {
    return (
      <div className="min-h-[100dvh] bg-[#121212] text-white pt-safe pb-safe px-4 relative flex flex-col justify-center">
        <GeometricBackdrop />
        <div className="max-w-md mx-auto w-full py-6 relative z-10">
          <div className="glass-card rounded-3xl p-5 sm:p-7 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#E11D23] text-white flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>

            <span className="inline-block mt-3 px-3 py-1 rounded-full bg-[#E11D23] text-white text-[11px] font-extrabold uppercase tracking-wider">
              #VOTINGSELESAI • {votedCount}/{totalCategories}
            </span>

            <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-2.5 leading-tight">
              Terima Kasih Sudah Memilih!
            </h1>
            <p className="text-xs text-[#BDBDBD] mt-1">
              Berubah pikiran? Kamu bisa mengubah atau membatalkan pilihan di bawah ini:
            </p>

            <div className="mt-5 space-y-2.5 text-left">
              {categories.map((cat, idx) => {
                const vote = myVotesMap[cat.id];
                return (
                  <div
                    key={cat.id}
                    className="glass-card rounded-2xl p-3.5 flex flex-col gap-2.5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#E11D23] text-white text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                        0{idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-semibold text-[#A3A3A3] block">
                          {cat.name}
                        </span>
                        <span className="text-sm font-extrabold text-white block leading-snug mt-0.5">
                          {vote?.teacher_name || 'Tersimpan'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setReviewMode(true);
                          setCurrentIndex(idx);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Ubah Pilihan</span>
                      </button>
                      <button
                        type="button"
                        disabled={canceling}
                        onClick={() => handleCancelVote(cat.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#E11D23]/25 hover:bg-[#E11D23] border border-[#E11D23]/60 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Batalkan</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setReviewMode(true);
                setCurrentIndex(0);
              }}
              className="mt-5 w-full py-3 rounded-xl glass-card glass-card-hover text-white text-xs font-extrabold cursor-pointer"
            >
              Lihat Kembali Semua Kategori
            </button>
          </div>
        </div>
      </div>
    );
  }

  const titleParts = splitCategoryTitle(currentCategory?.name || '');
  const stepNumFormatted = String(currentIndex + 1).padStart(2, '0');
  const isChangingExistingVote =
    Boolean(currentVote) &&
    Boolean(selectedTeacher) &&
    selectedTeacher.id !== currentVote.teacher_id;

  return (
    <div className="min-h-[100dvh] bg-[#121212] text-white relative flex flex-col justify-between">
      <GeometricBackdrop />

      {/* Konten Utama (Dioptimalkan untuk Layar iPhone Tanpa Elemen yang Saling Menutupi) */}
      <div className="w-full max-w-md sm:max-w-2xl mx-auto px-4 sm:px-6 pt-safe pb-6 relative z-10 flex-1 flex flex-col">
        {/* Top Bar Ringkas */}
        <header className="flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#E11D23] text-white flex items-center justify-center shrink-0">
              <CategoryGlyph icon={currentCategory?.icon} className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-extrabold uppercase tracking-wider text-white block leading-none truncate">
                PEMILIHAN GURU TERBAIK
              </span>
              <span className="text-[10px] text-[#A3A3A3] block mt-0.5 truncate">
                Kategori {currentIndex + 1} dari {totalCategories}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {allCompleted && (
              <button
                type="button"
                onClick={() => setReviewMode(false)}
                className="px-2.5 py-1 rounded-full glass-card text-white text-[11px] font-bold cursor-pointer"
              >
                Ringkasan
              </button>
            )}
            <span className="px-2.5 py-1 rounded-full bg-[#E11D23] text-white text-[11px] font-extrabold">
              {currentIndex + 1}/{totalCategories}
            </span>
          </div>
        </header>

        {/* Segmented Progress Bar */}
        <div
          className="grid gap-1.5 mt-3"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, totalCategories)}, minmax(0, 1fr))`,
          }}
        >
          {categories.map((cat, idx) => {
            const isDone = Boolean(myVotesMap[cat.id]);
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={cat.name}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-[#E11D23]'
                    : isDone
                    ? 'bg-white'
                    : 'bg-white/20'
                }`}
              />
            );
          })}
        </div>

        {/* Toast Notifikasi */}
        {toastMessage && (
          <div className="mt-3 rounded-xl bg-[#E11D23] text-white px-3.5 py-2.5 text-xs font-extrabold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {currentCategory && (
          <div className="mt-3 flex-1 flex flex-col">
            {/* Hero Title Bergaya Poster "Mobile / Legend 25" */}
            <div className="text-center py-1.5">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-none">
                {titleParts.top}
              </h1>
              <div className="inline-flex flex-col items-center mt-1">
                <div className="w-full h-[1.5px] bg-white/30" />
                <div className="flex items-baseline justify-center gap-2 py-0.5 px-2">
                  <span className="text-xl sm:text-3xl font-extrabold text-[#E11D23] tracking-tight leading-tight">
                    {titleParts.bottom}
                  </span>
                  <span className="text-xl sm:text-3xl font-extrabold stroke-number leading-tight">
                    {stepNumFormatted}
                  </span>
                </div>
                <div className="w-full h-[1.5px] bg-[#E11D23]" />
              </div>
              {currentCategory.description && (
                <p className="text-xs text-[#BDBDBD] mt-1.5 max-w-md mx-auto leading-relaxed">
                  {currentCategory.description}
                </p>
              )}
            </div>

            {/* Info Pilihan Tersimpan + Tombol Batalkan (Rapi & Tidak Terpotong di iPhone) */}
            {currentVote && (
              <div className="mt-2.5 glass-card-selected rounded-2xl p-3 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-[#E11D23] shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-[#D4D4D4] block leading-none">
                      Pilihanmu saat ini:
                    </span>
                    <strong className="text-xs sm:text-sm font-extrabold text-white block truncate mt-0.5">
                      {currentVote.teacher_name}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={canceling}
                  onClick={() => handleCancelVote(currentCategory.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#E11D23] hover:bg-[#c8181e] text-white text-xs font-extrabold shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{canceling ? 'Batal...' : 'Batalkan'}</span>
                </button>
              </div>
            )}

            {/* DAFTAR KARTU GURU: 1 Kolom Penuh di iPhone (Foto & Nama 100% Utuh Tidak Ada yang Ketutup!), 2 Kolom di Tablet/Desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5 mt-3">
              {(currentCategory.teachers || []).map((teacher, idx) => {
                const isVotedTeacher =
                  currentVote?.teacher_id === teacher.id && !selectedTeacher;
                const isSelected = selectedTeacher?.id === teacher.id;
                const isActiveCard = isSelected || isVotedTeacher;
                const isClosed = currentCategory.voting_status !== 'open';

                return (
                  <button
                    key={teacher.id}
                    type="button"
                    disabled={isClosed}
                    onClick={() => handleSelectTeacherCard(teacher)}
                    className={`w-full text-left rounded-2xl p-3 sm:p-3.5 flex items-center gap-3.5 transition-all ${
                      isActiveCard
                        ? 'glass-card-selected'
                        : isClosed
                        ? 'glass-card opacity-55 cursor-not-allowed'
                        : 'glass-card glass-card-hover cursor-pointer'
                    }`}
                  >
                    {/* Foto Guru Bersih Tanpa Badge yang Menutupi Wajah/Gambar */}
                    <div
                      className={`p-0.5 rounded-xl shrink-0 ${
                        isActiveCard ? 'bg-[#E11D23]' : 'bg-white/20'
                      }`}
                    >
                      <img
                        src={teacher.photo_url}
                        alt={teacher.name}
                        className="w-16 h-16 sm:w-18 sm:h-18 rounded-[10px] object-cover bg-[#181818] block"
                      />
                    </div>

                    {/* Informasi Nama, Mapel, dan Bio (Lebar Penuh & Tidak Terpotong) */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-white text-[10px] font-extrabold leading-none">
                          0{idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#E11D23] text-white text-[10px] font-extrabold leading-none">
                          {teacher.subject}
                        </span>
                      </div>

                      <h2 className="text-sm sm:text-base font-extrabold text-white mt-1.5 leading-snug break-words">
                        {teacher.name}
                      </h2>

                      {teacher.bio && (
                        <p className="text-[11px] text-[#BDBDBD] mt-0.5 line-clamp-2 leading-relaxed">
                          {teacher.bio}
                        </p>
                      )}
                    </div>

                    {/* Indikator Radio/Centang di Sisi Kanan (Di Luar Foto) */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          isActiveCard
                            ? 'bg-[#E11D23] text-white shadow-md'
                            : 'bg-white/5 border border-white/35 text-transparent'
                        }`}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <span
                        className={`text-[10px] font-extrabold ${
                          isActiveCard ? 'text-white' : 'text-[#A3A3A3]'
                        }`}
                      >
                        {isVotedTeacher
                          ? 'Terpilih'
                          : isSelected
                          ? 'Dipilih'
                          : currentVote
                          ? 'Ganti'
                          : 'Pilih'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {submitError && (
              <div className="mt-3 rounded-xl bg-[#E11D23]/25 border border-[#E11D23] px-3.5 py-2.5 text-xs font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D23]" />
                <span>{submitError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* STICKY BOTTOM BAR (Berada di Alur Dokumen di Bawah Kartu, TIDAK PERNAH Menutupi Kartu di iPhone!) */}
      <footer className="sticky bottom-0 z-30 w-full bg-[#121212]/90 backdrop-blur-xl border-t border-white/15 px-4 pt-3 pb-safe">
        <div className="max-w-md sm:max-w-2xl mx-auto">
          {selectedTeacher ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-[#BDBDBD] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#E11D23] shrink-0" />
                  <span>
                    {isChangingExistingVote ? 'Ganti pilihan ke:' : 'Guru dipilih:'}
                  </span>
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-white block truncate mt-0.5">
                  {selectedTeacher.name}
                </span>
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitAndNext}
                className="px-5 py-3 rounded-xl bg-[#E11D23] hover:bg-[#c8181e] active:scale-95 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shrink-0 shadow-lg transition-all cursor-pointer"
              >
                <span>
                  {submitting
                    ? 'Menyimpan...'
                    : isChangingExistingVote
                    ? 'Simpan Perubahan'
                    : votedCount + 1 < totalCategories
                    ? 'Pilih & Lanjut'
                    : 'Kirim & Selesai'}
                </span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl glass-card text-xs font-extrabold ${
                  currentIndex === 0
                    ? 'opacity-30 cursor-not-allowed'
                    : 'glass-card-hover text-white cursor-pointer'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>

              <span className="text-[11px] font-bold text-[#A3A3A3] text-center">
                {currentVote ? 'Ketuk kartu lain untuk ganti' : 'Ketuk kartu guru untuk memilih'}
              </span>

              <button
                type="button"
                disabled={currentIndex >= totalCategories - 1}
                onClick={() =>
                  setCurrentIndex((i) => Math.min(totalCategories - 1, i + 1))
                }
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl glass-card text-xs font-extrabold ${
                  currentIndex >= totalCategories - 1
                    ? 'opacity-30 cursor-not-allowed'
                    : 'glass-card-hover text-white cursor-pointer'
                }`}
              >
                <span>Berikutnya</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
