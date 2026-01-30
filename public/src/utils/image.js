// Ładuje plik jako obraz, skaluje do maxDimension i zwraca Blob
export const resizeImageToBlob = (file, { maxDimension = 1024, quality = 0.82 } = {}) => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) {
          reject(new Error("Nie udało się odczytać wymiarów obrazu."));
          return;
        }

        let width = w;
        let height = h;
        if (w > maxDimension || h > maxDimension) {
          if (w >= h) {
            width = maxDimension;
            height = Math.round((h * maxDimension) / w);
          } else {
            height = maxDimension;
            width = Math.round((w * maxDimension) / h);
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Brak kontekstu canvas."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Nie udało się skompresować obrazu."));
          },
          "image/jpeg",
          quality
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Nieprawidłowy lub uszkodzony plik obrazu."));
    };

    img.src = url;
  });
};
