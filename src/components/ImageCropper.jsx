import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';

const ImageCropper = ({ imageSrc, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropChange = (crop) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom) => {
    setZoom(zoom);
  };

  const onCropCompleteHandler = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues on CodeSandbox
      image.src = url;
    });

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    // set canvas width to match the bounding box
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // draw image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    // As Base64 string
    // return canvas.toDataURL('image/jpeg');

    // As Blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((file) => {
        resolve(file);
      }, 'image/jpeg', 0.7);
    });
  };

  const handleSave = async () => {
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImageBlob);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md h-[60vh] bg-black rounded-lg overflow-hidden shadow-2xl border border-gray-800">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteHandler}
          onZoomChange={onZoomChange}
          cropShape="round"
          showGrid={false}
        />
      </div>

      <div className="w-full max-w-md mt-6 space-y-6">
        {/* Zoom Slider */}
        <div className="flex items-center gap-4 px-4">
            <span className="text-gray-400 text-sm">➖</span>
            <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(e.target.value)}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <span className="text-gray-400 text-sm">➕</span>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
            <button
            onClick={onCancel}
            className="px-6 py-3 rounded-full bg-gray-800 text-white font-bold hover:bg-gray-700 transition-colors"
            >
            Cancel
            </button>
            <button
            onClick={handleSave}
            className="px-6 py-3 rounded-full bg-green-500 text-white font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/30"
            >
            Done
            </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
