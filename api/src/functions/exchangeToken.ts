import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { ConfidentialClientApplication } from "@azure/msal-node";
import * as jwt from "jsonwebtoken";

export async function exchangeToken(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Token exchange function triggered');

    // Validate required environment variables
    const requiredEnvVars = ["CLIENT_ID", "CLIENT_SECRET", "TENANT_ID", "API_SCOPE"];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            context.error(`Missing required environment variable: ${envVar}`);
            return {
                status: 500,
                jsonBody: { error: `Server configuration error: Missing ${envVar}` }
            };
        }
    }

    // CORS headers for Teams
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env["CORS_ORIGIN"] || 'https://green-rock-024c27f1e.1.azurestaticapps.net',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return {
            status: 200,
            headers
        };
    }

    try {
        // Get Teams SSO token from request body
        const body = await request.json() as { token?: string };
        const teamsToken = body?.token;
        
        if (!teamsToken) {
            return {
                status: 400,
                headers,
                jsonBody: { error: 'No token provided' }
            };
        }

        // Validate it's a JWT (basic check)
        const decoded = jwt.decode(teamsToken, { complete: true });
        if (!decoded) {
            return {
                status: 400,
                headers,
                jsonBody: { error: 'Invalid token format' }
            };
        }

        // Configure MSAL for OBO flow
        const msalConfig = {
            auth: {
                clientId: process.env["CLIENT_ID"]!,
                clientSecret: process.env["CLIENT_SECRET"]!,
                authority: `https://login.microsoftonline.com/${process.env["TENANT_ID"]}`
            }
        };

        const cca = new ConfidentialClientApplication(msalConfig);

        // Exchange token using OBO flow
        const oboRequest = {
            oboAssertion: teamsToken,
            scopes: [process.env["API_SCOPE"]!]
        };

        const response = await cca.acquireTokenOnBehalfOf(oboRequest);

        if (response && response.accessToken) {
            return {
                status: 200,
                headers,
                jsonBody: {
                    access_token: response.accessToken,
                    token_type: "Bearer",
                    expires_in: response.expiresOn ? Math.floor((response.expiresOn.getTime() - Date.now()) / 1000) : 3600
                }
            };
        } else {
            throw new Error('No access token received');
        }

    } catch (error: any) {
        context.log('Token exchange error:', error);
        
        // Provide meaningful error messages
        let errorMessage = 'Token exchange failed';
        let statusCode = 500;

        if (error.errorCode === 'invalid_grant') {
            errorMessage = 'Invalid or expired Teams token';
            statusCode = 401;
        } else if (error.errorCode === 'invalid_request') {
            errorMessage = 'Invalid request parameters';
            statusCode = 400;
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            status: statusCode,
            headers,
            jsonBody: { 
                error: errorMessage,
                details: process.env["NODE_ENV"] === "development" ? error.toString() : undefined
            }
        };
    }
}