import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { parseURL } from "ufo";
import routes from "./redirects.json";

export async function redirect(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const originalUrl = request.headers.get("x-ms-original-url");

  let notFoundPageText = "";
  if (originalUrl) {
    const parsedURL = parseURL(originalUrl);

    const matchedRoute = routes.find((route) =>
      new RegExp(route.route).test(parsedURL.pathname),
    );

    if (matchedRoute) {
      const redirectTarget = parsedURL.pathname.replace(
        new RegExp(matchedRoute.route),
        matchedRoute.redirect,
      );

      return {
        status: 301, // permanent redirect
        headers: { location: redirectTarget },
      };
    }

    // download 404 page contents from the site
    const notFoundUrl = `${parsedURL.protocol}//${parsedURL.host}/errors/404.html`;
    notFoundPageText = await (await fetch(notFoundUrl)).text();
  }

  return {
    status: 404,
    headers: {
      "Content-Type": "text/html",
    },
    body: notFoundPageText,
  };
}

app.http("redirect", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: redirect,
});
