import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Trophy, Eye, EyeOff, CheckCircle2, Users } from 'lucide-react';
import { CategoryGlyph } from './TruBrandLogo';

export default function PosterGenerator({ categories = [], initialCategoryId = null }) {
  const posterRef = useRef(null);
  const [selectedCatId, setSelectedCatId] = useState(
    initialCategoryId || categories[0]?.category_id || null
  );
  const [displayMode, setDisplayMode] = useState('winner');
  const [showVoteStats, setShowVoteStats] = useState(true);
  const [schoolName, setSchoolName] = useState('SMK TUNAS HARAPAN PATI');
  const [downloading, setDownloading] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState('');

  const activeCategory =
    categories.find((c) => Number(c.category_id) === Number(selectedCatId)) ||
    categories[0] ||
    null;
  const winner = activeCategory?.winner || null;
  const topThree = activeCategory?.top_three || [];

  const handleDownloadPng = async () => {
    if (!posterRef.current || !activeCategory) return;
    setDownloading(true);
    setDownloadMsg('');
    try {
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#141414',
      });
      const link = document.createElement('a');
      link.download = `poster-${activeCategory.category_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}-${displayMode}.png`;
      link.href = dataUrl;
      link.click();
      setDownloadMsg('Poster PNG berhasil diunduh.');
    } catch (err) {
      setDownloadMsg('Gagal membuat PNG: ' + (err.message || ''));
    } finally {
      setDownloading(false);
    }
  };

  if (!activeCategory) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="text-sm font-bold text-white">Belum ada data kategori.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Panel Pengaturan Glass */}
      <div className="lg:col-span-5 glass-card rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-extrabold text-white">
          Pengaturan <span className="text-[#E11D23]">Poster</span>
        </h3>

        <div>
          <label className="block text-xs font-bold text-[#BDBDBD] mb-1.5">Kategori</label>
          <select
            value={activeCategory.category_id}
            onChange={(e) => setSelectedCatId(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E1E1E] border border-white/25 text-white text-sm font-bold outline-none"
          >
            {categories.map((cat) => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.category_name} ({cat.total_votes} suara)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#BDBDBD] mb-1.5">Mode Tampilan</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'winner', label: 'Hanya Juara 1', Icon: Trophy },
              { id: 'top3', label: 'Top 3 Terbaik', Icon: Users },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setDisplayMode(id)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border cursor-pointer ${
                  displayMode === id
                    ? 'bg-[#E11D23] text-white border-[#E11D23]'
                    : 'bg-white/5 text-white border-white/20'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowVoteStats((v) => !v)}
          className="w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between border border-white/25 bg-white/5 text-white cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {showVoteStats ? <Eye className="w-4 h-4 text-[#E11D23]" /> : <EyeOff className="w-4 h-4" />}
            {showVoteStats ? 'Jumlah Suara Ditampilkan' : 'Jumlah Suara Disembunyikan'}
          </span>
        </button>

        <div>
          <label className="block text-xs font-bold text-[#BDBDBD] mb-1.5">Nama Sekolah / Acara</label>
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/25 text-white text-xs font-bold outline-none"
          />
        </div>

        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={downloading || !winner}
          className="w-full py-3.5 rounded-xl bg-[#E11D23] hover:bg-[#c8181e] text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? 'Memproses PNG...' : 'Unduh Poster PNG'}</span>
        </button>

        {downloadMsg && (
          <div className="rounded-xl bg-[#E11D23]/20 border border-[#E11D23] p-3 text-xs font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#E11D23]" />
            <span>{downloadMsg}</span>
          </div>
        )}
      </div>

      {/* Kanvas Poster Bergaya Referensi Poster (#141414 + Segitiga Merah #E11D23 + Glass Card) */}
      <div className="lg:col-span-7 flex flex-col items-center">
        <div className="w-full max-w-[520px] rounded-3xl overflow-hidden border border-white/25">
          <div
            ref={posterRef}
            className="bg-[#141414] text-white p-7 sm:p-8 relative overflow-hidden"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {/* Ornamen Segitiga Merah Solid di Belakang Glass Card */}
            <svg
              viewBox="0 0 600 700"
              fill="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <polygon points="0,120 460,390 0,590" fill="#E11D23" fillOpacity="0.85" />
              <circle
                cx="480"
                cy="210"
                r="95"
                stroke="#E11D23"
                strokeOpacity="0.55"
                strokeWidth="1.5"
              />
              <circle cx="420" cy="270" r="24" fill="#E11D23" />
            </svg>

            {/* Header Poster */}
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-extrabold tracking-wide text-white uppercase">
                  {schoolName}
                </h4>
                <span className="text-[10px] text-[#9E9E9E] block">
                  Disiplin, Terampil, Prestasi
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#E11D23] text-white font-extrabold text-xs flex items-center justify-center">
                VG
              </div>
            </div>

            {/* Judul Kategori Bergaya "Mobile Legend 25" */}
            <div className="relative z-10 text-center mt-7">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#BDBDBD] block">
                PEMENANG KATEGORI
              </span>
              <h2 className="text-3xl font-extrabold text-white mt-1 leading-tight">
                {activeCategory.category_name}
              </h2>
              <div className="w-40 h-0.5 bg-[#E11D23] mx-auto mt-2" />
            </div>

            {!winner ? (
              <div className="relative z-10 my-8 glass-card rounded-2xl p-6 text-center">
                <p className="text-sm font-bold">Belum ada suara.</p>
              </div>
            ) : displayMode === 'winner' ? (
              <div
                className="relative z-10 mt-7 rounded-2xl p-5 flex items-center justify-between gap-4"
                style={{
                  backgroundColor: 'rgba(20, 20, 20, 0.68)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.45)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-white">Juara 1</span>
                    <span className="text-xs font-semibold text-[#BDBDBD]">
                      *Terpilih
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-white mt-2">
                    {winner.name}
                  </h3>
                  <p className="text-xs font-bold text-[#E11D23] mt-0.5">
                    {winner.subject}
                  </p>
                  {showVoteStats && (
                    <p className="text-xs font-bold text-[#D4D4D4] mt-3">
                      Perolehan: <strong className="text-white">{winner.votes} Suara</strong> ({winner.percentage}%)
                    </p>
                  )}
                </div>

                {/* Kotak Foto Berbingkai Merah seperti QR Code di Poster */}
                <div className="bg-[#E11D23] p-2 rounded-xl text-center shrink-0">
                  <img
                    src={winner.photo_url}
                    alt={winner.name}
                    crossOrigin="anonymous"
                    className="w-24 h-24 rounded-lg object-cover bg-[#181818] block"
                  />
                  <span className="text-[10px] font-extrabold text-white block mt-1">
                    #JUARA1
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative z-10 mt-6 space-y-2.5">
                {topThree.map((item, idx) => (
                  <div
                    key={item.teacher_id}
                    className="rounded-2xl p-3.5 flex items-center justify-between gap-3"
                    style={{
                      backgroundColor: 'rgba(20, 20, 20, 0.72)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-[#E11D23] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <img
                        src={item.photo_url}
                        alt={item.name}
                        crossOrigin="anonymous"
                        className="w-12 h-12 rounded-lg object-cover shrink-0 bg-[#181818] border border-[#E11D23]"
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-extrabold text-white truncate">
                          {item.name}
                        </h4>
                        <p className="text-xs text-[#BDBDBD] truncate">{item.subject}</p>
                      </div>
                    </div>
                    {showVoteStats && (
                      <div className="text-right px-2.5 py-1.5 rounded-lg bg-[#E11D23] text-white shrink-0">
                        <span className="text-xs font-extrabold block leading-none">
                          {item.percentage}%
                        </span>
                        <span className="text-[10px] font-bold block mt-0.5">
                          {item.votes} suara
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Footer Poster */}
            <div className="relative z-10 mt-7 pt-3 flex items-center justify-between text-[11px] text-[#BDBDBD]">
              <span className="font-bold text-white">Voting Guru Terbaik</span>
              <span className="px-3 py-1 rounded-full bg-[#E11D23] text-white text-[10px] font-extrabold">
                #GURUTERBAIK
              </span>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-[#E11D23]" />
          </div>
        </div>
      </div>
    </div>
  );
}
