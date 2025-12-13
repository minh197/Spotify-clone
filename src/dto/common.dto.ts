/**
 * Common DTOs and validation functions used across multiple entities
 */

/**
 * Validates and transforms string field (removes quotes, trims)
 * @param value - String value to validate
 * @param fieldName - Name of the field for error messages
 * @param required - Whether the field is required
 * @returns Validated string
 * @throws Error if validation fails
 */
export const validateString = (
  value: any,
  fieldName: string,
  required: boolean = false
): string => {
  if (value === undefined || value === null) {
    if (required) {
      throw new Error(`${fieldName} is required`);
    }
    throw new Error(`${fieldName} must be provided`);
  }

  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  const cleaned = trimmed.replace(/^["']|["']$/g, "");

  if (cleaned === "") {
    if (required) {
      throw new Error(`${fieldName} is required and must be a non-empty string`);
    }
    throw new Error(`${fieldName} cannot be empty or just quotes`);
  }

  return cleaned;
};

/**
 * Validates optional string field
 * @param value - String value to validate
 * @returns Validated string or null
 */
export const validateOptionalString = (value: any): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

/**
 * Validates and transforms integer field
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @param min - Minimum value (default: 1)
 * @param required - Whether the field is required
 * @returns Validated number
 * @throws Error if validation fails
 */
export const validateInteger = (
  value: any,
  fieldName: string,
  min: number = 1,
  required: boolean = false
): number => {
  if (value === undefined || value === null) {
    if (required) {
      throw new Error(`${fieldName} is required`);
    }
    throw new Error(`${fieldName} must be provided`);
  }

  const parsed = parseInt(String(value), 10);

  if (isNaN(parsed)) {
    throw new Error(`Invalid ${fieldName}. Must be a number`);
  }

  if (parsed < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }

  return parsed;
};

/**
 * Validates optional integer field
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @param min - Minimum value (default: 1)
 * @returns Validated number or null
 */
export const validateOptionalInteger = (
  value: any,
  fieldName: string,
  min: number = 1
): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = parseInt(String(value), 10);

  if (isNaN(parsed) || parsed < min) {
    return null;
  }

  return parsed;
};

/**
 * Validates boolean field from string or boolean
 * @param value - Boolean value (string "true"/"false" or boolean)
 * @param fieldName - Name of the field for error messages
 * @param defaultValue - Default value if not provided
 * @returns Boolean value
 * @throws Error if value is invalid
 */
export const validateBooleanField = (
  value: any,
  fieldName: string,
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

  throw new Error(`${fieldName} must be a boolean or 'true'/'false' string`);
};

