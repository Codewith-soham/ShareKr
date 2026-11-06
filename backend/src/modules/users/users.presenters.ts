import type { User } from '../../generated/prisma/client.js';

// What OTHER riders may see about a user. Each function returns only whitelisted fields,
// so a new column on `users` can never leak by accident.
//
//   toPoolPreview  -> anyone browsing pools (before joining): first name + last initial, photo
//   toPoolMember   -> ACTIVE members of the same OPEN/READY pool: full name, photo, phone
//
// Never exposed to other users: email, gender, account status, verification flags, ids of
// sessions or tokens. (Own profile uses toUserSummary in auth.service.ts.)
//
// These functions only shape data. The pool module decides WHO may receive the member view
// (active member of that pool, pool still OPEN or READY).

type NameAndImage = Pick<User, 'id' | 'fullName' | 'profileImageUrl'>;

export interface PoolPreviewUser {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
}

export interface PoolMemberUser extends PoolPreviewUser {
  fullName: string;
  phone: string | null;
}

// "Soham Kulkarni" -> "Soham K."   "Soham" -> "Soham"
export const toDisplayName = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1] : undefined;
  if (!last) return first;
  return `${first} ${Array.from(last)[0]!.toUpperCase()}.`;
};

export const toPoolPreview = (user: NameAndImage): PoolPreviewUser => ({
  id: user.id,
  displayName: toDisplayName(user.fullName),
  profileImageUrl: user.profileImageUrl,
});

export const toPoolMember = (user: NameAndImage & Pick<User, 'phone'>): PoolMemberUser => ({
  ...toPoolPreview(user),
  fullName: user.fullName,
  phone: user.phone,
});
