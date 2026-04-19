import NextAuth, { DefaultSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { compare } from "bcrypt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
    accessToken?: string;
  }

  interface User {
    role?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/v2.0`,
      authorization: {
        params: {
          scope: "openid profile email offline_access Mail.Read Mail.ReadWrite Mail.Read.Shared Mail.ReadWrite.Shared MailboxSettings.Read",
        },
      },
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        // Buscar usuario por email o name (para aceptar "admin" directamente)
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: credentials.username as string },
              { name: credentials.username as string },
            ],
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 días en segundos
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user, account }) {
      // Para Microsoft, crear o actualizar usuario en BD
      if (account?.provider === "microsoft-entra-id" && user.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (existingUser) {
            // Actualizar nombre e imagen si cambiaron
            await prisma.user.update({
              where: { email: user.email },
              data: {
                name: user.name || existingUser.name,
                image: user.image || existingUser.image,
              },
            });
            user.id = existingUser.id;
            user.role = existingUser.role;
          } else {
            // Crear nuevo usuario
            const newUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || user.email.split("@")[0],
                image: user.image,
                role: "user",
              },
            });
            user.id = newUser.id;
            user.role = newUser.role;
          }
        } catch (error) {
          console.error("Error creating/updating user:", error);
          // Redirigir con error de base de datos
          throw new Error("DatabaseConnectionError");
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role || "user";
      }
      // Guardar access token de Microsoft
      if (account?.provider === "microsoft-entra-id" && account.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      if (token.accessToken) {
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
});
