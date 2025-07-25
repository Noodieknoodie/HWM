import { app } from "@azure/functions";
import { exchangeToken } from "./functions/exchangeToken";

app.http('exchangeToken', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: exchangeToken
});