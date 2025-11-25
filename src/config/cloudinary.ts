import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Validate Cloudinary environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.warn(
    "⚠️  Cloudinary credentials not configured. Image uploads will fail."
  );
  console.warn(
    "   Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file"
  );
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
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
  // Check if Cloudinary is configured
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables."
    );
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found at path: ${filePath}`);
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: options.folder || "spotify-clone",
      resource_type: options.resource_type || "image",
    });

    // Delete the temporary file
    fs.unlinkSync(filePath);

    return result.secure_url;
  } catch (error: any) {
    // Clean up temp file even if upload fails
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Provide more detailed error message
    const errorMessage = error?.message || "Unknown Cloudinary error";
    const errorHttpCode = error?.http_code || "N/A";
    throw new Error(
      `Cloudinary upload failed: ${errorMessage} (HTTP ${errorHttpCode})`
    );
  }
};

export default cloudinary;
