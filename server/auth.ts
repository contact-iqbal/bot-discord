import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { type User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "aurabot-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      secure: process.env.NODE_ENV === "production",
    },
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new DiscordStrategy(
      {
        clientID: process.env.DISCORD_CLIENT_ID || "1475678249240494232",
        clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
        callbackURL: process.env.DISCORD_CALLBACK_URL || process.env.CALLBACK_URL || "http://localhost:5000/api/auth/discord/callback",
        scope: ["identify", "guilds"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await storage.getUserByDiscordId(profile.id);
          
          const userData = {
            discordId: profile.id,
            username: profile.username,
            avatar: profile.avatar,
            accessToken: accessToken,
          };

          if (!user) {
            user = await storage.createUser(userData);
          } else {
            user = await storage.updateUser(user.id, userData);
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.get("/api/auth/discord", passport.authenticate("discord"));

  app.get(
    "/api/auth/discord/callback",
    passport.authenticate("discord", { failureRedirect: "/login" }),
    (req, res) => {
      res.redirect("/");
    }
  );

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
}
