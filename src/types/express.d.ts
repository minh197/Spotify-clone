declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        name: string;
        email: string;
        profilePicture: string | null;
        isAdmin: boolean;
      };
    }
  }
}

export {}; //marking the file as a module so the augmentation works;
