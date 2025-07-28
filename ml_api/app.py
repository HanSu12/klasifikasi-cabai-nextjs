from flask import Flask, request, jsonify
import joblib
import numpy as np
import cv2
from flask_cors import CORS

# --- 1. Inisialisasi Aplikasi Flask ---
app = Flask(__name__)
CORS(app) # Mengizinkan Cross-Origin Resource Sharing

# --- 2. Muat Model dan Label Encoder ---
try:
    # Memuat model pemenang yang sudah dilatih
    model = joblib.load('model_pemenang.pkl')
    # Memuat label encoder untuk konversi kelas
    le = joblib.load('label_encoder.pkl')
    print("✅ Model dan Label Encoder berhasil dimuat.")
except FileNotFoundError as e:
    print(f"❌ ERROR: File model atau label encoder tidak ditemukan. Pastikan 'model_pemenang.pkl' dan 'label_encoder.pkl' ada di folder yang sama.")
    model = None
    le = None

# --- 3. Fungsi Pra-pemrosesan Gambar ---
def extract_color_histogram(image_stream, bins=(8, 8, 8)):
    """
    Ekstraksi histogram warna HSV dari stream gambar.
    """
    # Membaca stream gambar menjadi format yang bisa dibaca cv2
    file_bytes = np.asarray(bytearray(image_stream.read()), dtype=np.uint8)
    image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

    if image is None:
        return None
    
    # Konversi ke HSV dan hitung histogram
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0, 1, 2], None, bins, [0, 256, 0, 256, 0, 256])
    cv2.normalize(hist, hist)
    
    # Meratakan histogram menjadi vektor 1D (512 fitur)
    return hist.flatten()


# --- 4. Endpoint untuk Prediksi (VERSI FINAL LENGKAP) ---
@app.route('/predict', methods=['POST'])
def predict():
    # Pemeriksaan awal untuk memastikan model sudah dimuat
    if model is None or le is None:
        return jsonify({'error': 'Model tidak tersedia di server'}), 500

    # Pemeriksaan untuk memastikan ada file gambar dalam request
    if 'image' not in request.files:
        return jsonify({'error': 'Request tidak berisi file gambar'}), 400
        
    file = request.files['image']
    
    # Pemeriksaan untuk memastikan file tidak kosong
    if file.filename == '':
        return jsonify({'error': 'File gambar tidak valid atau kosong'}), 400

    try:
        # 1. Ekstraksi fitur dari gambar yang diunggah
        histogram_fitur = extract_color_histogram(file.stream)
        
        # Pastikan gambar berhasil diproses
        if histogram_fitur is None:
            return jsonify({'error': 'Gagal memproses gambar, format mungkin tidak didukung'}), 400

        # 2. Siapkan data dalam format yang bisa diterima model (.reshape)
        data_untuk_prediksi = histogram_fitur.reshape(1, -1)

        # Lakukan prediksi dengan variabel yang sekarang sudah ada
        probabilitas = model.predict_proba(data_untuk_prediksi)[0]
        
        # Dapatkan hasil teratas
        indeks_teratas = np.argmax(probabilitas)
        keyakinan_teratas = probabilitas[indeks_teratas]
        prediksi_teratas = le.classes_[indeks_teratas]

        # Logika Threshold 97%
        THRESHOLD = 0.75
        if keyakinan_teratas < THRESHOLD:
            return jsonify({
                'status': 'Gagal',
                'message': 'Gambar tidak teridentifikasi sebagai cabai.',
                'confidence': f"{keyakinan_teratas * 100:.2f}%"
            })
            
        # Peta Kadar Air berbasis data
        kadar_air_map = {
            'segar': '85% - 90%',      # Nilai umum untuk cabai segar
            'sedang': '40% - 60%',      # Perkiraan untuk kondisi menengah
            'kering': '~11.11%'         # Berdasarkan data Excel Anda!
        }
        kadar_air = kadar_air_map.get(prediksi_teratas.lower(), 'Tidak diketahui')
            
        # Siapkan semua probabilitas untuk ditampilkan di frontend
        semua_probabilitas = []
        for i, nama_kelas in enumerate(le.classes_):
            semua_probabilitas.append({
                'kelas': nama_kelas.capitalize(), 
                'persentase': f"{probabilitas[i] * 100:.2f}" 
            })
            
        # Kirim respons sukses yang lengkap
        return jsonify({
            'status': 'Sukses',
            'prediction': prediksi_teratas,
            'confidence': f"{keyakinan_teratas * 100:.2f}",
            'probabilities': semua_probabilitas,
            'kadar_air': kadar_air
        })

    except Exception as e:
        # Blok ini yang mencetak error ke terminal Anda
        print(f"❗️ Terjadi error saat prediksi: {e}") 
        return jsonify({'error': 'Terjadi kesalahan internal di server.'}), 500

# --- 5. Jalankan Aplikasi ---
if __name__ == '__main__':
    # host='0.0.0.0' membuat server bisa diakses dari luar container/jaringan
    app.run(host='0.0.0.0', port=5000, debug=True)