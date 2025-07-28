// app/page.tsx

"use client";

import { useState, useEffect, useCallback, Fragment } from 'react';

// Definisikan tipe data
type PredictionResult = {
  prediction: string;
  confidence: string;
  probabilities: { kelas: string; persentase: string }[];
  kadar_air: string;
};

// Komponen Modal (Pop-up) yang bisa dipakai ulang
const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-lg text-gray-200">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};


export default function Home() {
  // State untuk semua fungsionalitas
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<PredictionResult[]>([]);

  // State untuk mengontrol modal
  const [isHowToModalOpen, setIsHowToModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('chiliHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Gagal memuat riwayat dari localStorage", e);
    }
  }, []);

  const handlePredict = useCallback(async (file: File) => {
    if (!file) return;
    setIsLoading(true);
    setResult(null);
    setError(null);
    const formData = new FormData();
    formData.append('image', file);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/predict';

    try {
      const response = await fetch(API_URL, { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Terjadi kesalahan pada server.');
      if (data.status && data.status === 'Gagal') {
        setError(data.message || 'Gambar tidak teridentifikasi sebagai cabai.');
      } else {
        setResult(data);
        const updatedHistory = [data, ...history].slice(0, 3);
        setHistory(updatedHistory);
        localStorage.setItem('chiliHistory', JSON.stringify(updatedHistory));
      }
    } catch (err: any) {
      setError(err.message || 'Gagal terhubung ke API.');
    } finally {
      setIsLoading(false);
    }
  }, [history]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      handlePredict(file);
    }
  }, [handlePredict]);

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setIsLoading(false);
    if (document.getElementById('file-upload')) {
        (document.getElementById('file-upload') as HTMLInputElement).value = "";
    }
  };

  const getPredictionColor = (prediction: string = '') => {
    switch (prediction.toLowerCase()) {
      case 'segar': return 'green-400';
      case 'sedang': return 'yellow-400';
      case 'kering': return 'red-500';
      default: return 'gray-400';
    }
  };
  
  const getCareTips = (prediction: string = '') => {
    // ... (Fungsi ini tidak perlu diubah) ...
      switch (prediction.toLowerCase()) {
          case 'segar':
              return {
                  title: 'Perawatan Cabai Segar',
                  tips: [
                      "Simpan di kulkas dalam kantong plastik berlubang agar tetap segar.",
                      "Jangan mencuci cabai hingga saat akan digunakan untuk mencegah pembusukan.",
                      "Jika ingin lebih awet, potong tangkainya dan simpan bersama bawang putih."
                  ]
              };
          case 'sedang':
              return {
                  title: 'Perawatan Cabai Setengah Kering',
                  tips: [
                      "Segera gunakan untuk bumbu masakan agar rasa tidak hilang.",
                      "Jemur atau angin-anginkan di tempat sejuk hingga benar-benar kering.",
                      "Hindari menyimpan di tempat lembab untuk mencegah jamur."
                  ]
              };
          case 'kering':
              return {
                  title: 'Perawatan Cabai Kering',
                  tips: [
                      "Simpan dalam wadah kedap udara di tempat yang gelap dan sejuk.",
                      "Untuk aroma lebih kuat, sangrai sebentar sebelum dihaluskan.",
                      "Jauhkan dari sinar matahari langsung agar warna tidak pudar."
                  ]
              };
          default:
              return null;
      }
  };

  const careTips = result ? getCareTips(result.prediction) : null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-gray-200">
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 p-4 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img src="/logo-cabai.png" alt="Logo Cabai" className="h-12 w-12" />
              <h1 className="text-xl md:text-2xl font-bold text-white">
                Klasifikasi Cabai
              </h1>
            </div>
            <div className="flex items-center gap-4 text-sm font-medium">
                <button onClick={() => setIsHowToModalOpen(true)} className="text-gray-300 hover:text-white transition-colors">Cara Penggunaan</button>
                <button onClick={() => setIsAboutModalOpen(true)} className="text-gray-300 hover:text-white transition-colors">Tentang</button>
            </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          <div className="lg:col-span-2 bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg flex flex-col items-center justify-center h-full">
            <h2 className="text-2xl font-bold mb-4 self-start text-white">1. Unggah Gambar</h2>
            {!preview ? (
              <label
                htmlFor="file-upload"
                className="w-full h-64 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-700/50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-slate-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <span className="mt-2 text-sm font-medium text-slate-400">Klik untuk memilih file</span>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </label>
            ) : (
              <div className="w-full text-center">
                <img src={preview} alt="Preview" className="max-h-64 w-auto mx-auto rounded-lg mb-4 shadow-md" />
                <button
                  onClick={handleReset}
                  className="bg-slate-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-700 transition-transform hover:scale-105"
                >
                  Pilih Gambar Lain
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg flex flex-col justify-center min-h-[400px]">
              <h2 className="text-2xl font-bold mb-4 text-white">2. Hasil Analisis</h2>
              <div className="flex items-center justify-center h-full">
              {isLoading && (
              <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-lg font-semibold text-slate-300">Menganalisis citra cabai...</p>
              </div>
              )}
              {!isLoading && error && (
                  <div className="text-center text-red-400 bg-red-500/10 p-4 rounded-lg">
                      <h3 className="text-xl font-bold">❌ Gagal Menganalisis</h3>
                      <p>{error}</p>
                  </div>
              )}
              {!isLoading && result && (
              <div className="w-full text-center animate-fade-in">
                  <div className={`text-4xl font-bold mb-3 text-${getPredictionColor(result.prediction)}`}>
                  {result.prediction}
                  </div>
                  
                  <div className="flex justify-center flex-wrap gap-4 mb-6">
                      <div className={`text-sm font-semibold text-white bg-${getPredictionColor(result.prediction)}/80 py-1 px-4 rounded-full`}>
                          Keyakinan: {result.confidence}
                      </div>
                      <div className="text-sm font-semibold text-white bg-sky-500/80 py-1 px-4 rounded-full">
                          Kadar Air: {result.kadar_air}
                      </div>
                  </div>

                  <div className="text-left w-full max-w-md mx-auto">
                  <h4 className="font-bold mb-3 text-slate-200">Detail Probabilitas:</h4>
                  {result.probabilities.sort((a,b) => parseFloat(b.persentase) - parseFloat(a.persentase)).map((prob, index) => (
                      <div key={index} className="mb-3">
                      <div className="flex justify-between font-medium text-sm mb-1">
                          <span className="text-slate-300">{prob.kelas}</span>
                          <span className={`font-bold text-${getPredictionColor(prob.kelas)}`}>{prob.persentase}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2.5">
                          <div
                          className={`bg-${getPredictionColor(prob.kelas)} h-2.5 rounded-full transition-all duration-500`}
                          style={{ width: `${prob.persentase}%` }}
                          ></div>
                      </div>
                      </div>
                  ))}
                  </div>
              </div>
              )}
              {!isLoading && !result && !error && (
              <div className="text-center text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="mt-2 text-lg font-medium">Hasil prediksi akan muncul di sini.</p>
              </div>
              )}
              </div>
          </div>
        </div>
        
        {careTips && (
            <div className="mt-8 bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-white">{careTips.title}</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-300">
                    {careTips.tips.map((tip, index) => <li key={index}>{tip}</li>)}
                </ul>
            </div>
        )}

        {history.length > 0 && (
            <div className="mt-8 bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-white">Riwayat Analisis Terakhir</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {history.map((item, index) => (
                        <div key={index} className={`p-4 rounded-lg shadow-md border-l-8 border-${getPredictionColor(item.prediction)} bg-slate-700/50`}>
                            <h3 className={`font-bold text-xl text-${getPredictionColor(item.prediction)}`}>{item.prediction}</h3>
                            <p className="text-sm text-slate-300">Keyakinan: <span className="font-semibold text-white">{item.confidence}</span></p>
                            <p className="text-sm text-slate-300">Kadar Air: <span className="font-semibold text-white">{item.kadar_air}</span></p>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </main>
      
      <footer className="text-center p-4 text-slate-500 text-sm">
        Dibuat dengan Sepenuh Hati :p
      </footer>
      
      <Modal isOpen={isHowToModalOpen} onClose={() => setIsHowToModalOpen(false)} title="Cara Penggunaan">
          <ol className="list-decimal list-inside space-y-3 text-slate-300">
              <li>Klik tombol "Pilih File" atau area unggah untuk memilih gambar cabai dari perangkat Anda.</li>
              <li>Aplikasi akan secara otomatis memulai proses analisis setelah gambar dipilih.</li>
              <li>Hasil analisis, tingkat keyakinan, dan detail probabilitas akan muncul di panel kanan.</li>
              <li>Di bawah hasil, Anda akan mendapatkan saran perawatan yang sesuai dengan kondisi cabai.</li>
              <li>Untuk menganalisis gambar lain, klik tombol "Pilih Gambar Lain".</li>
          </ol>
      </Modal>
      <Modal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} title="Tentang Aplikasi">
          <p className="text-slate-300">
              Aplikasi ini adalah sebuah sistem cerdas yang memanfaatkan teknologi Machine Learning untuk mengklasifikasikan tingkat kekeringan cabai berdasarkan citra digital. Tujuannya adalah untuk membantu petani dan pedagang dalam mengidentifikasi kualitas cabai secara cepat dan akurat.
          </p>
      </Modal>
    </div>
  );
}

// Tambahkan definisi class warna dinamis agar Tailwind tidak menghapusnya
// <span className="hidden bg-red-500 text-red-500 border-red-500"></span>
// <span className="hidden bg-green-400 text-green-400 border-green-400"></span>
// <span className="hidden bg-yellow-400 text-yellow-400 border-yellow-400"></span>
// <span className="hidden bg-sky-500/80"></span>