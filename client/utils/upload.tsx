const CLOUDINARY_NAME = 'dvgkefwvh';
const UPLOAD_PRESET = 'ayblcpvt';

export const uploadImageToCloudinary = async (fileUri: string): Promise<string> => {
  try {
    const data = new FormData();
    data.append('upload_preset', UPLOAD_PRESET);
    data.append('cloud_name', CLOUDINARY_NAME);

    if (fileUri.startsWith('blob:') || fileUri.startsWith('data:')) {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      data.append('file', blob, 'upload.jpg');
    } else {
      const fileData: any = {
        uri: fileUri,
        type: 'image/jpeg',
        name: 'upload.jpg',
      };
      data.append('file', fileData);
    }

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_NAME}/image/upload`,
      { method: 'POST', body: data }
    );

    const result = await response.json();

    if (result.secure_url) {
      return result.secure_url;
    } else {
      throw new Error('Upload thất bại: ' + result.error?.message);
    }
  } catch (error) {
    console.error('Lỗi uploadUtils:', error);
    throw error;
  }
};