import express from "express";
import { createServer } from "vite";
import { join } from "path";
import { config } from "./helpers/config";
import { initAuthentication, requireAuth } from "./authentication";
import dotenv from "dotenv";
import { Contact, Payment } from "./admin/components/Contacts";
import { Invoice } from "./admin/components/Invoices";
import { createSepaXMLDocument, generateMessageId } from "./helpers/sepa";
import xmlFormat from "xml-formatter";
import { formatIsoToDate, isValidDate } from "./helpers/utils";
import { fetchWithCache } from "./helpers/fetch";

dotenv.config();

(async () => {
  if (
    !process.env.CONFIG_PANEL_USERNAME ||
    !process.env.CONFIG_PANEL_PASSWORD
  ) {
    console.error(
      "The application could not be launched because no credentials for the configuration panel were provided. Please set CONFIG_PANEL_USERNAME and CONFIG_PANEL_PASSWORD variables."
    );
    process.exit(0);
  }

  const port = 8000;

  const app = express();

  app.use(express.json());

  initAuthentication(app);

  /* Get config */
  app.get("/api/config", function (req, res) {
    res.send(config.store);
  });

  /* Update config */
  app.post("/api/config", function (req, res) {
    const parsedFields = req.body || {};

    try {
      config.set(parsedFields);
    } catch (error) {
      console.error(error);

      res.status(500).send("Could not update configuration");
    }

    res.status(200).send({ success: true, configuration: config.store });
  });
  // Client web:
  if (process.env.NODE_ENV === "development") {
    // Serve client web through vite dev server:
    const viteDevServer = await createServer({
      server: {
        middlewareMode: true,
      },
      configFile: join(process.cwd(), "vite.config.js"),
      root: join(process.cwd(), "server", "admin"),
      base: "/",
    });
    app.use(viteDevServer.middlewares);
  } else {
    app.use(express.static(join(process.cwd(), "dist")));
  }

  app.listen(port);
  console.log("Server started: http://localhost:" + port);
})();
