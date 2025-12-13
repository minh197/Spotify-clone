// Constants for pagination limits
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

export interface PaginationQueryDto {
  limit?: number;
}

export interface SearchQueryDto {
  search?: string;
}

export interface GenreQueryDto {
  genre?: string;
}

export interface ArtistIdQueryDto {
  artistId?: number;
}

export interface SongQueryDto
  extends SearchQueryDto,
    GenreQueryDto,
    ArtistIdQueryDto {}

export interface VerifiedQueryDto {
  verified?: boolean;
}

export interface AlbumQueryDto extends SearchQueryDto, ArtistIdQueryDto {}

export interface ArtistQueryDto extends SearchQueryDto, VerifiedQueryDto {}

export interface PlaylistQueryDto extends SearchQueryDto {}

/**
 * Validates and transforms limit query parameter
 * @param rawLimit - The raw limit value from query string
 * @param defaultLimit - Default limit if not provided or invalid (default: DEFAULT_LIMIT)
 * @param maxLimit - Maximum allowed limit (default: MAX_LIMIT)
 * @returns Validated limit number
 */
export const validateLimit = (
  rawLimit: string | undefined,
  defaultLimit: number = DEFAULT_LIMIT,
  maxLimit: number = MAX_LIMIT
): number => {
  if (!rawLimit || typeof rawLimit !== "string") {
    return defaultLimit;
  }

  const parsedLimit = parseInt(rawLimit, 10);
  if (isNaN(parsedLimit) || parsedLimit <= 0) {
    return defaultLimit;
  }

  return Math.min(parsedLimit, maxLimit);
};

/**
 * Validates and transforms artistId query parameter
 * @param rawArtistId - The raw artistId value from query string
 * @returns Validated artistId number or undefined
 */
export const validateArtistId = (
  rawArtistId: string | undefined
): number | undefined => {
  if (!rawArtistId || typeof rawArtistId !== "string") {
    return undefined;
  }

  const id = parseInt(rawArtistId, 10);
  if (isNaN(id) || id <= 0) {
    return undefined;
  }

  return id;
};

/**
 * Validates and transforms search query parameter
 * @param search - The raw search value from query string
 * @returns Validated search string or undefined
 */
export const validateSearch = (
  search: string | undefined
): string | undefined => {
  if (!search || typeof search !== "string" || search.trim() === "") {
    return undefined;
  }
  return search.trim();
};

/**
 * Validates and transforms genre query parameter
 * @param genre - The raw genre value from query string
 * @returns Validated genre string or undefined
 */
export const validateGenre = (
  genre: string | undefined
): string | undefined => {
  if (!genre || typeof genre !== "string" || genre.trim() === "") {
    return undefined;
  }
  return genre.trim();
};

/**
 * Validates and transforms verified query parameter (boolean)
 * @param verified - The raw verified value from query string
 * @returns Validated boolean or undefined
 */
export const validateVerified = (
  verified: string | undefined
): boolean | undefined => {
  if (verified === "true") {
    return true;
  }
  if (verified === "false") {
    return false;
  }
  return undefined;
};

/**
 * Validates and transforms ID parameter from route params
 * @param rawId - The raw ID value from route params
 * @param paramName - Name of the parameter for error messages (default: "id")
 * @returns Validated ID number
 * @throws Error if ID is invalid
 */
export const validateId = (rawId: string, paramName: string = "id"): number => {
  const id = parseInt(rawId, 10);
  if (isNaN(id) || id <= 0) {
    throw new Error(`Invalid ${paramName}`);
  }
  return id;
};
