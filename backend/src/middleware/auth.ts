import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    branchId?: string | null;
    branchCode?: string | null;
    username: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as AuthRequest['user'];
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'رمز المصادقة غير صالح أو منتهي الصلاحية' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'غير مصرح' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'ليس لديك صلاحية للقيام بهذا الإجراء' });
      return;
    }
    next();
  };
};

// Ensures branch users can only access their own branch data
export const enforceBranchAccess = (branchIdGetter: (req: AuthRequest) => string | undefined) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'غير مصرح' });
      return;
    }

    if (req.user.role === 'ADMIN' || req.user.role === 'FACTORY') {
      next();
      return;
    }

    const targetBranchId = branchIdGetter(req);
    if (targetBranchId && targetBranchId !== req.user.branchId) {
      res.status(403).json({ error: 'لا يمكنك الوصول إلى بيانات فرع آخر' });
      return;
    }

    next();
  };
};
