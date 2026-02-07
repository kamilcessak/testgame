/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: utils/image.js                                                        ║
 * ║  CO ROBI: Skalowanie i kompresja obrazów                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * DLACZEGO KOMPRESOWAĆ OBRAZY?
 * 
 * Zdjęcie z telefonu:
 * - Rozdzielczość: 4000x3000 pikseli (12 megapikseli)
 * - Rozmiar: 3-10 MB
 * 
 * Po kompresji:
 * - Rozdzielczość: max 1024x1024 pikseli
 * - Rozmiar: ~100-300 KB
 * 
 * ZALETY:
 * - Mniej miejsca w IndexedDB
 * - Szybsze ładowanie listy posiłków
 * - Szybsze renderowanie w UI
 * 
 * JAK TO DZIAŁA?
 * 
 * 1. Ładujemy obraz do <img>
 * 2. Rysujemy na <canvas> w zmniejszonym rozmiarze
 * 3. Eksportujemy canvas jako JPEG Blob
 * 
 * Canvas API pozwala na:
 * - Skalowanie (zmiana rozmiaru)
 * - Kompresję (wybór jakości JPEG)
 * - Konwersję formatów (PNG → JPEG)
 */

/**
 * Skaluje i kompresuje obraz do Blob JPEG
 * 
 * PRZEPŁYW:
 * 1. Stwórz Object URL z pliku
 * 2. Załaduj do <img>
 * 3. Oblicz nowe wymiary (zachowaj proporcje)
 * 4. Narysuj na <canvas>
 * 5. Eksportuj jako JPEG Blob
 * 
 * @param {File} file - Plik obrazu do przetworzenia
 * @param {object} opts - Opcje
 * @param {number} opts.maxDimension - Maksymalna szerokość LUB wysokość (px)
 * @param {number} opts.quality - Jakość JPEG (0-1, np. 0.82 = 82%)
 * @returns {Promise<Blob>} Skompresowany obraz jako Blob
 * 
 * PRZYKŁAD:
 * const compressed = await resizeImageToBlob(file, {
 *   maxDimension: 1024,
 *   quality: 0.82
 * });
 * // compressed to Blob ~200KB JPEG
 */
export const resizeImageToBlob = (file, { maxDimension = 1024, quality = 0.82 } = {}) => {
  return new Promise((resolve, reject) => {
    /**
     * KROK 1: Stwórz Object URL
     * 
     * URL.createObjectURL(file) tworzy tymczasowy URL:
     * "blob:http://localhost:8001/abc-123-456"
     * 
     * Można go użyć w <img src="...">
     */
    const url = URL.createObjectURL(file);
    
    /**
     * KROK 2: Stwórz element <img>
     * 
     * Nie dodajemy go do DOM - używamy tylko do załadowania obrazu
     */
    const img = new Image();

    /**
     * Gdy obraz się załaduje
     */
    img.onload = () => {
      /**
       * WAŻNE: Zwolnij Object URL
       * 
       * Object URL zajmuje pamięć dopóki nie zostanie zwolniony.
       * Gdy obraz jest już załadowany do img, URL nie jest potrzebny.
       */
      URL.revokeObjectURL(url);
      
      try {
        /**
         * KROK 3: Pobierz oryginalne wymiary
         * 
         * naturalWidth/naturalHeight - rzeczywiste wymiary obrazu
         * width/height - wymiary wyświetlania (mogą być inne)
         */
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        
        // Sprawdź czy wymiary są prawidłowe
        if (!w || !h) {
          reject(new Error("Nie udało się odczytać wymiarów obrazu."));
          return;
        }

        /**
         * KROK 4: Oblicz nowe wymiary
         * 
         * Zachowujemy proporcje (aspect ratio)!
         * 
         * Przykład: obraz 4000x3000, maxDimension 1024
         * - szerokość > wysokość
         * - nowa szerokość = 1024
         * - nowa wysokość = 3000 * 1024 / 4000 = 768
         * - wynik: 1024x768
         */
        let width = w;
        let height = h;
        
        if (w > maxDimension || h > maxDimension) {
          if (w >= h) {
            // Obraz poziomy lub kwadratowy
            width = maxDimension;
            height = Math.round((h * maxDimension) / w);
          } else {
            // Obraz pionowy
            height = maxDimension;
            width = Math.round((w * maxDimension) / h);
          }
        }

        /**
         * KROK 5: Stwórz canvas
         * 
         * Canvas to "płótno" na którym możemy rysować.
         * Nie dodajemy go do DOM - używamy tylko do przetwarzania.
         */
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        
        /**
         * KROK 6: Pobierz kontekst 2D
         * 
         * Kontekst to "pędzel" którym rysujemy na canvas.
         * "2d" to standardowy kontekst do grafiki 2D.
         */
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Brak kontekstu canvas."));
          return;
        }
        
        /**
         * KROK 7: Narysuj obraz na canvas
         * 
         * drawImage(img, x, y, width, height)
         * - img = źródło obrazu
         * - x, y = pozycja (0,0 = lewy górny róg)
         * - width, height = docelowe wymiary (skalowanie!)
         */
        ctx.drawImage(img, 0, 0, width, height);

        /**
         * KROK 8: Eksportuj jako Blob
         * 
         * canvas.toBlob(callback, type, quality)
         * - callback = funkcja wywoływana z Blobem
         * - type = typ MIME ("image/jpeg")
         * - quality = jakość 0-1 (tylko dla JPEG)
         * 
         * JPEG jest lepszy niż PNG bo:
         * - Mniejszy rozmiar (kompresja stratna)
         * - Wystarczający dla zdjęć
         */
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Nie udało się skompresować obrazu."));
            }
          },
          "image/jpeg",
          quality
        );
        
      } catch (err) {
        reject(err);
      }
    };

    /**
     * Gdy ładowanie obrazu się nie powiedzie
     */
    img.onerror = () => {
      // Zwolnij URL przed odrzuceniem
      URL.revokeObjectURL(url);
      reject(new Error("Nieprawidłowy lub uszkodzony plik obrazu."));
    };

    /**
     * KROK 1b: Rozpocznij ładowanie
     * 
     * Ustawienie src uruchamia ładowanie.
     * Gdy się załaduje → onload
     * Gdy błąd → onerror
     */
    img.src = url;
  });
};
