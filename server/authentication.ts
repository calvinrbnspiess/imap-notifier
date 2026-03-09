import { Express, NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import session, { Session } from "express-session";
import { createHash } from "node:crypto";

declare global {
  namespace Express {
    interface Request {
      session: Session;
    }
  }

  namespace NodeJS {
    interface ProcessEnv {
      CONFIG_PANEL_USERNAME: string;
      CONFIG_PANEL_PASSWORD: string;
      SESSION_SECRET: string;
    }
  }
}

/* client sends username and a sha256 hashed password, the env variable is hashed in two rounds with sha256 and sha512 */
const checkCredentials = (username, passwordHash) => {
  console.log(`Checking credentails for user <${username}> ...`);

  if (username !== process.env.CONFIG_PANEL_USERNAME) {
    console.log(`Username does not match.`);

    return false;
  }

  const sha512 = createHash("sha512").update(passwordHash).digest("hex");

  console.log(sha512);
  if (sha512 !== process.env.CONFIG_PANEL_PASSWORD) {
    console.log(`Password does not match.`);

    return false;
  }

  console.log(`Credentials are correct.`);

  return true;
};

export const initAuthentication = (app: Express) => {
  app.use(
    session({
      name: "_session",
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: "auto",
        httpOnly: false,
        maxAge: 15 * 60 * 1000 /* 15 minutes validity */,
        sameSite: true,
      },
    })
  );

  app.use(cookieParser());

  /* Login */
  app.post("/login", function (req, res) {
    const parsedFields: { username: string; password: string } = req.body || {};

    if (checkCredentials(parsedFields.username, parsedFields.password)) {
      req.session.authenticated = true;
      res.status(200).send({ success: true });
      return;
    }

    res.status(401).send({ success: false });
  });

  app.all("*", requireAuth);
};

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // clear unknown cookies
  for (const cookieName in req.cookies) {
    if (cookieName !== "_session") {
      console.log("remove unknown cookie", cookieName);
      res.clearCookie(cookieName);
    }
  }

  // clear invalid/tampered sessions
  if (req.cookies._session && !req.session.authenticated) {
    console.log(
      "remove invalid session cookie",
      req.cookies._session,
      req.session.authenticated
    );
    res.clearCookie("_session");
  }

  if (!req.path.startsWith("/api")) {
    next();
    return;
  }

  if (req.session.authenticated) {
    next(); // User is authenticated, continue to next middleware
  } else {
    res.sendStatus(401);
  }
};
