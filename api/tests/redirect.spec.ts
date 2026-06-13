import { redirect } from "../src/functions/redirect";
import {
  EffectiveFunctionOptions,
  FunctionInput,
  FunctionOutput,
  HttpOutput,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
  InvocationContextExtraInputs,
  InvocationContextExtraOutputs,
  RetryContext,
  TraceContext,
  TriggerMetadata,
} from "@azure/functions";

// mock the InvocationContext minimally
class MockContext implements InvocationContext {
  invocationId: string = "";
  functionName: string = "";
  extraInputs: InvocationContextExtraInputs = {
    get: function (): unknown {
      throw new Error("Function not implemented.");
    },
    set: function (inputOrName: FunctionInput | string, value: unknown): void {
      throw new Error("Function not implemented.");
    },
  };
  extraOutputs: InvocationContextExtraOutputs = {
    set: function (output: HttpOutput): void {
      throw new Error("Function not implemented.");
    },
    get: function (outputOrName: FunctionOutput | string): unknown {
      throw new Error("Function not implemented.");
    },
  };
  log(...args: any[]): void {
    console.log("[test] log:", ...args);
  }
  trace(...args: any[]): void {
    console.trace("[test] trace:", ...args);
  }
  debug(...args: any[]): void {
    console.debug("[test] debug:", ...args);
  }
  info(...args: any[]): void {
    console.info("[test] info:", ...args);
  }
  warn(...args: any[]): void {
    console.warn("[test] warn:", ...args);
  }
  error(...args: any[]): void {
    console.error("[test] error:", ...args);
  }
  retryContext?: RetryContext;
  traceContext?: TraceContext;
  triggerMetadata?: TriggerMetadata;
  options: EffectiveFunctionOptions = {
    trigger: {
      type: "",
      name: "",
    },
    extraInputs: [],
    extraOutputs: [],
  };
}

const baseUrl = "https://www.myserver.com";

async function invokeRedirect(route: string): Promise<HttpResponseInit> {
  const context = new MockContext();
  const request = new HttpRequest({
    url: "http://localhost/api/redirect",
    method: "GET",
    headers: { "x-ms-original-url": `${baseUrl}${route}` },
  });

  return await redirect(request, context);
}

afterEach(() => {
  jest.clearAllMocks();
});

test.each`
  route                   | expected
  ${"/categories/dotnet"} | ${"/tags/dotnet.html"}
  ${"/categories/csharp"} | ${"/tags/csharp.html"}
`(
  "redirects to $route -> $expected",
  async ({ route, expected }: { route: string; expected: string }) => {
    const response = await invokeRedirect(route);

    expect(response.status).toBe(301);
    const location = (response.headers as Record<string, string> | undefined)
      ?.location;
    expect(location).toBe(expected);
  },
);

test.each`
  route
  ${"/tags/unknown.html"}
  ${"/category/dotnet"}
`(
  "returns 404 page for unmatched route $route",
  async ({ rule, route }: { rule: string; route: string }) => {
    const notFoundPageText = "404 Not Found";

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(notFoundPageText),
    });

    const response = await invokeRedirect(route);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/errors/404.html`);

    expect(response.status).toBe(404);
    expect(response.body).toBe(notFoundPageText);
    const contentType = (
      response.headers as Record<string, string> | undefined
    )?.["Content-Type"];
    expect(contentType).toBe("text/html");
  },
);
