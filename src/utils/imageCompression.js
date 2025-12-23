
/**
 * Compresses an image file by resizing and reducing quality.
 * @param {File} file - The image file to compress.
 * @param {number} quality - The quality of the output JPEG (0.0 to 1.0). Default is 0.7.
 * @param {number} maxWidth - The maximum width of the output image. Default is 1920.
 * @returns {Promise<Blob>} - A promise that resolves to the compressed image Blob.
 */
export const compressImage = (file, quality = 0.7, maxWidth = 1920) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Resize if width exceeds maxWidth
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas is empty'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};
