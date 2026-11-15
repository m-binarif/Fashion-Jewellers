/**
 * cloudinary.js — Reusable Cloudinary upload, delete, and cleanup utilities.
 */

const cloudinary = require('../config/cloudinary');
const fs = require('fs');

/**
 * Uploads a local file to Cloudinary.
 * @param {string} localFilePath - Path to temporary file on disk.
 * @param {object} [options={}] - Additional Cloudinary upload parameters.
 * @returns {Promise<object>} Upload response containing secure_url and public_id.
 */
const uploadOnCloudinary = async (localFilePath, options = {}) => {
  try {
    if (!localFilePath || typeof localFilePath !== 'string') {
      return null;
    }

    if (!fs.existsSync(localFilePath)) {
      throw new Error(`File not found at path: ${localFilePath}`);
    }

    const uploadOptions = {
      resource_type: 'image',
      folder: 'fashion-jewellers/products',
      ...options
    };

    const response = await cloudinary.uploader.upload(localFilePath, uploadOptions);
    return response;
  } catch (error) {
    // If upload fails, clean up the temporary local file unless explicitly told not to
    if (localFilePath && fs.existsSync(localFilePath) && options.cleanupOnError !== false) {
      try {
        await fs.promises.unlink(localFilePath);
      } catch (cleanupErr) {
        console.warn(`[Cloudinary Upload Cleanup] Failed to unlink temp file ${localFilePath}:`, cleanupErr.message);
      }
    }
    throw error;
  }
};

/**
 * Deletes an image from Cloudinary by its public ID.
 * @param {string} publicId - Cloudinary asset public ID.
 * @param {object} [options={}] - Additional destruction options.
 * @returns {Promise<object|null>}
 */
const deleteFromCloudinary = async (publicId, options = {}) => {
  try {
    if (!publicId || typeof publicId !== 'string') {
      return null;
    }
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      ...options
    });
    return response;
  } catch (error) {
    console.error(`[Cloudinary Destroy] Failed to remove asset with public_id '${publicId}':`, error.message);
    throw error;
  }
};

/**
 * Safely deletes a temporary local file using fs.promises.unlink.
 * @param {string} filePath - Absolute or relative file path to delete.
 */
const deleteLocalFile = async (filePath) => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.warn(`[Local File Cleanup] Error unlinking file '${filePath}':`, err.message);
  }
};

module.exports = {
  uploadOnCloudinary,
  deleteFromCloudinary,
  deleteLocalFile
};
