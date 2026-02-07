/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: utils/file.js                                                         ║
 * ║  CO ROBI: Odczytuje pliki jako Data URL                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * CO TO JEST DATA URL?
 * 
 * Data URL to sposób na osadzenie danych bezpośrednio w URL.
 * 
 * NORMALNY URL:
 * https://example.com/photo.jpg
 * → Przeglądarka musi pobrać plik z serwera
 * 
 * DATA URL:
 * data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...
 * → Dane są WBUDOWANE w URL (zakodowane w base64)
 * 
 * ZASTOSOWANIE:
 * - Osadzanie małych obrazów w CSS/HTML
 * - Przechowywanie obrazów w localStorage (tekst)
 * - Eksport danych bez serwera
 * 
 * WADY:
 * - ~33% większy rozmiar (base64)
 * - Wolniejsze parsowanie dla dużych plików
 * 
 * UWAGA: W tym projekcie używamy Blob zamiast Data URL
 * bo IndexedDB obsługuje Bloby bezpośrednio (mniejszy rozmiar).
 * Ta funkcja jest zostawiona jako alternatywa/utility.
 */

/**
 * Odczytuje plik jako Data URL
 * 
 * PRZEPŁYW:
 * 1. Stwórz FileReader
 * 2. Ustaw callbacki (onload, onerror)
 * 3. Rozpocznij odczyt (readAsDataURL)
 * 4. FileReader asynchronicznie czyta plik
 * 5. Gdy skończone → onload z wynikiem
 * 
 * @param {File} file - Plik do odczytania
 * @returns {Promise<string>} Data URL
 * 
 * PRZYKŁAD:
 * const input = document.querySelector('input[type="file"]');
 * const file = input.files[0];
 * const dataUrl = await readFileAsDataURL(file);
 * // dataUrl = "data:image/jpeg;base64,/9j/4AAQSk..."
 * 
 * img.src = dataUrl;  // Można użyć bezpośrednio
 */
export const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    /**
     * FileReader - API do odczytu plików
     * 
     * Może czytać pliki jako:
     * - Text (readAsText)
     * - ArrayBuffer (readAsArrayBuffer)
     * - Data URL (readAsDataURL)
     */
    const reader = new FileReader();
    
    /**
     * Gdy odczyt zakończony pomyślnie
     * 
     * reader.result zawiera wynik:
     * - Dla readAsDataURL: string "data:image/jpeg;base64,..."
     */
    reader.onload = () => resolve(reader.result);
    
    /**
     * Gdy odczyt się nie powiódł
     */
    reader.onerror = reject;
    
    /**
     * Rozpocznij odczyt jako Data URL
     * 
     * To jest asynchroniczne - wynik będzie w onload
     */
    reader.readAsDataURL(file);
  });
