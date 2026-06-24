import NextAuth from "next-auth";
import NeonAdapter from "@auth/neon-adapter";
import { Pool, neonConfig } from "@neondatabase/serverless";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const sql = neon(process.env.DATABASE_URL!);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: NeonAdapter(pool),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const rows = await sql`
          SELECT id, email, name, password_hash, role
          FROM users
          WHERE email = ${credentials.email as string}
        `;
        const user = rows[0];
        if (!user || !user.password_hash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    async session({ session, user }) {
      // Rolle aus DB holen und in Session schreiben
      const rows = await sql`SELECT role FROM users WHERE id = ${user.id}`;
      session.user.id = user.id;
      session.user.role = (rows[0]?.role ?? "user") as string;
      return session;
    },
    async signIn({ user }) {
      // Admin-E-Mail automatisch zur Admin-Rolle befördern
      if (user.email && user.email === process.env.ADMIN_EMAIL) {
        await sql`UPDATE users SET role = 'admin' WHERE email = ${user.email} AND role != 'admin'`;
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
});
