import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface UploadOptions {
  folder?: string;
  resource_type?: "image" | "video" | "raw" | "auto";
}

/**
 * Upload a file to Cloudinary and delete the local temp file
 * @param filePath - Path to the local file
 * @param options - Cloudinary upload options
 * @returns Promise with secure_url of uploaded file
 */
export const uploadToCloudinary = async (
  filePath: string,
  options: UploadOptions = {}
): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: options.folder || "spotify-clone",
      resource_type: options.resource_type || "image",
    });

    // Delete the temporary file
    fs.unlinkSync(filePath);

    return result.secure_url;
  } catch (error) {
    // Clean up temp file even if upload fails
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
};

export default cloudinary;
