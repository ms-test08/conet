import { cache } from "react";

import { createClient } from "@/lib/server";

export type UserSession = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  profilePicUrl: string | null;
  userRole: string | null;
};

type UserRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  profile_pic_url: string | null;
  user_role: string | null;
};

const USER_SELECT_FIELDS =
  "id, email, first_name, last_name, username, profile_pic_url, user_role";

function mapUserSession(user: UserRow): UserSession {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    profilePicUrl: user.profile_pic_url,
    userRole: user.user_role,
  };
}

export const getCurrentUserSession = cache(
  async (): Promise<UserSession | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();

    if (error || !data?.claims?.sub) {
      return null;
    }

    const userId = data.claims.sub;
    const { data: user, error: userError } = await supabase
      .from("users")
      .select(USER_SELECT_FIELDS)
      .eq("id", userId)
      .maybeSingle();

    if (userError || !user) {
      return null;
    }

    return mapUserSession(user as UserRow);
  },
);
