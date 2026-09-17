import { getSession } from "@/lib/server/session";

export async function GET() {
  const session = await getSession();
  return Response.json(
    session
      ? {
          authenticated: true,
          user: { id: session.userId, email: session.email },
        }
      : { authenticated: false, user: null },
  );
}