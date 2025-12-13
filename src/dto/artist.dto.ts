/**
 * DTOs for Artist-related requests
 */

export interface CreateArtistDto {
  name: string;
  bio?: string | null;
  dob?: Date | null;
  verificationStatus?: boolean;
  image?: string | null;
}

export interface UpdateArtistDto {
  name?: string;
  bio?: string | null;
  dob?: Date | null;
  verificationStatus?: boolean;
  image?: string | null;
}

/**
 * Validates and transforms date string to Date object
 * @param dateString - Date string in ISO format
 * @returns Date object or null if invalid
 * @throws Error if date format is invalid
 */
export const validateDate = (dateString: string | undefined | null): Date | null => {
  if (!dateString || typeof dateString !== "string" || dateString.trim() === "") {
    return null;
  }

  const date = new Date(dateString.trim());
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date format. Use ISO format (YYYY-MM-DD)");
  }

  return date;
};

/**
 * Validates and transforms boolean from string or boolean
 * @param value - Boolean value (string "true"/"false" or boolean)
 * @param defaultValue - Default value if not provided
 * @returns Boolean value
 * @throws Error if value is invalid
 */
export const validateBoolean = (
  value: string | boolean | undefined | null,
  defaultValue: boolean = false
): boolean => {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (value === "true" || value === true) {
    return true;
  }

  if (value === "false" || value === false) {
    return false;
  }

  throw new Error("Value must be a boolean or 'true'/'false' string");
};

/**
 * Validates create artist request body
 * @param body - Request body
 * @throws Error if validation fails
 */
export const validateCreateArtist = (body: any): CreateArtistDto => {
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    throw new Error("Name is required and must be a non-empty string");
  }

  let dob: Date | null = null;
  if (body.dob !== undefined && body.dob !== null) {
    dob = validateDate(body.dob);
  }

  const verificationStatus = validateBoolean(body.verificationStatus, false);

  return {
    name: name.trim(),
    bio: body.bio?.trim() || null,
    dob,
    verificationStatus,
    image: body.image?.trim() || null,
  };
};

/**
 * Validates update artist request body
 * @param body - Request body
 * @returns Validated update data
 */
export const validateUpdateArtist = (body: any): UpdateArtistDto => {
  const updateData: UpdateArtistDto = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim() === "") {
      throw new Error("Name must be a non-empty string");
    }
    updateData.name = body.name.trim();
  }

  if (body.bio !== undefined) {
    updateData.bio =
      body.bio && typeof body.bio === "string" && body.bio.trim() !== ""
        ? body.bio.trim()
        : null;
  }

  if (body.verificationStatus !== undefined) {
    updateData.verificationStatus = validateBoolean(body.verificationStatus);
  }

  if (body.dob !== undefined) {
    updateData.dob = validateDate(body.dob);
  }

  if (body.image !== undefined) {
    updateData.image = body.image?.trim() || null;
  }

  return updateData;
};

