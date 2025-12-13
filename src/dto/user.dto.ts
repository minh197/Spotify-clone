/**
 * DTOs for User-related requests
 */

export interface RegisterUserDto {
  email: string;
  password: string;
  username?: string;
  fullName?: string;
  isAdmin?: boolean;
  address?: string;
}

export interface LoginUserDto {
  email: string;
  password: string;
}

export interface UpdateUserProfileDto {
  fullName?: string;
  username?: string;
  address?: string;
  phoneNumber?: string;
  password?: string;
}

/**
 * Validates email format
 * @param email - Email string to validate
 * @returns true if valid, false otherwise
 */
export const isValidEmail = (email: string): boolean => {
  return email.includes("@") && email.trim().length >= 6;
};

/**
 * Validates register user request body
 * @param body - Request body
 * @throws Error if validation fails
 */
export const validateRegisterUser = (body: any): RegisterUserDto => {
  const { email, password } = body;

  if (!email || email.trim() === "" || !password || password.trim() === "") {
    throw new Error("Email and password are required");
  }

  if (email.trim().length < 6) {
    throw new Error("Email length needs to be 6 characters or more");
  }

  if (!isValidEmail(email)) {
    throw new Error("Invalid email format");
  }

  return {
    email: email.trim(),
    password: password.trim(),
    username: body.username?.trim(),
    fullName: body.fullName?.trim(),
    isAdmin: body.isAdmin ?? false,
    address: body.address?.trim(),
  };
};

/**
 * Validates login user request body
 * @param body - Request body
 * @throws Error if validation fails
 */
export const validateLoginUser = (body: any): LoginUserDto => {
  const { email, password } = body;

  if (!email || email.trim() === "" || !password || password.trim() === "") {
    throw new Error("Email and password are required");
  }

  return {
    email: email.trim(),
    password: password.trim(),
  };
};

/**
 * Validates update user profile request body
 * @param body - Request body
 * @returns Validated update data
 */
export const validateUpdateUserProfile = (body: any): Partial<{
  fullName: string | null;
  username: string | null;
  address: string | null;
  phoneNumber: string | null;
  password: string;
}> => {
  const updateData: Partial<{
    fullName: string | null;
    username: string | null;
    address: string | null;
    phoneNumber: string | null;
    password: string;
  }> = {};

  if (body.fullName !== undefined) {
    updateData.fullName = body.fullName?.trim() || null;
  }

  if (body.username !== undefined) {
    updateData.username = body.username?.trim() || null;
  }

  if (body.address !== undefined) {
    updateData.address = body.address?.trim() || null;
  }

  if (body.phoneNumber !== undefined) {
    updateData.phoneNumber = body.phoneNumber?.trim() || null;
  }

  if (body.password !== undefined) {
    if (typeof body.password !== "string" || body.password.trim() === "") {
      throw new Error("Password must be a non-empty string");
    }
    updateData.password = body.password.trim();
  }

  return updateData;
};

