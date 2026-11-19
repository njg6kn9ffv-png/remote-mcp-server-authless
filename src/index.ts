
import {
  OAuthResourceServer,
  insufficientScope,
  type AuthorizationServerBinding
} from "@cloudflare/workers-oauth-provider";


import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";

function createServer() {
	const server = new McpServer({
		name: "Authless Calculator",
		version: "1.0.0",
	});

  // 091伺服器報名查詢：模擬測試版本
  server.registerTool(
    "lookup_registration",
    {
      description:
        "查詢世紀帝國M 091伺服器R2萬星霸業第二輪的報名狀態。目前僅為測試工具。",
      inputSchema: z.object({
        uid: z.string().describe("玩家遊戲UID"),
      }),
    },
    async ({ uid }) => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              activity: "091 R2萬星霸業 第二輪",
              uid,
              status: "test_only",
              message: "MCP工具測試成功，尚未連接真實報名資料"
            }),
          },
        ],
      };
    }
  );

	server.registerTool(
		"add",
		{ inputSchema: z.object({ a: z.number(), b: z.number() }) },
		async ({ a, b }) => ({
			content: [{ type: "text", text: String(a + b) }],
		}),
	);

	server.registerTool(
		"calculate",
		{
			inputSchema: z.object({
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			}),
		},
		async ({ operation, a, b }) => {
			let result: number;
			switch (operation) {
				case "add":
					result = a + b;
					break;
				case "subtract":
					result = a - b;
					break;
				case "multiply":
					result = a * b;
					break;
				case "divide":
					if (b === 0)
						return {
							content: [
								{
									type: "text",
									text: "Error: Cannot divide by zero",
								},
							],
						};
					result = a / b;
					break;
			}
			return { content: [{ type: "text", text: String(result) }] };
		},
	);

	return server;
}


type AuthProps = {
  googleSub: string;
};

type McpEnv = Env & {
  AUTH_SERVER: AuthorizationServerBinding<AuthProps>;
};

const handler = createMcpHandler(createServer);

export default new OAuthResourceServer<McpEnv, AuthProps>({

resourceMetadata: {
  resource:
    "https://oauth-protection-test-remote-mcp-server-authless.2znjrtzc9g.workers.dev/mcp",
  authorization_servers: [
    "https://091-registration-auth.2znjrtzc9g.workers.dev"
  ]
},


  requiredScopes: ["mcp:read"],

  validateToken: (env) =>
    env.AUTH_SERVER.validateToken,

  handler: {
    fetch(request, env, ctx) {
      if (!ctx.auth.scope.includes("mcp:read")) {
        return insufficientScope(
          ctx.auth,
          ["mcp:read"]
        );
      }

      return handler(request, env, ctx);
    }
  }
});

