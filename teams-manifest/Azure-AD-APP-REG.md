{
	"id": "a57baa1f-d855-420a-9261-2d81100f92d9",
	"deletedDateTime": null,
	"appId": "cc64b230-1e3b-49e3-9a1e-4bb95b55ddb0",
	"applicationTemplateId": null,
	"disabledByMicrosoftStatus": null,
	"createdDateTime": "2025-07-06T07:25:09Z",
	"displayName": "HWM 401k Payments Manager",
	"description": null,
	"groupMembershipClaims": null,
	"identifierUris": [
		"api://green-rock-024c27f1e.1.azurestaticapps.net/cc64b230-1e3b-49e3-9a1e-4bb95b55ddb0"
	],
	"isDeviceOnlyAuthSupported": null,
	"isFallbackPublicClient": null,
	"nativeAuthenticationApisEnabled": null,
	"notes": null,
	"publisherDomain": "HohimerWealthManagement.com",
	"serviceManagementReference": null,
	"signInAudience": "AzureADMyOrg",
	"tags": [],
	"tokenEncryptionKeyId": null,
	"samlMetadataUrl": null,
	"defaultRedirectUri": null,
	"certification": null,
	"optionalClaims": null,
	"requestSignatureVerification": null,
	"addIns": [],
	"api": {
		"acceptMappedClaims": null,
		"knownClientApplications": [],
		"requestedAccessTokenVersion": 2,
		"oauth2PermissionScopes": [
			{
				"adminConsentDescription": "Allow the application to access HWM 401k Payments Manager on behalf of the signed-in user",
				"adminConsentDisplayName": "Access HWM 401k Payments Manager",
				"id": "d167fa29-cd2d-4afe-96ae-524d0ccbb7a2",
				"isEnabled": true,
				"type": "User",
				"userConsentDescription": "Allow the application to access HWM 401k Payments Manager on your behalf",
				"userConsentDisplayName": "Access HWM 401k Payments Manager",
				"value": "access_as_user"
			}
		],
		"preAuthorizedApplications": [
			{
				"appId": "5e3ce6c0-2b1f-4285-8d4b-75ee78787346",
				"delegatedPermissionIds": [
					"d167fa29-cd2d-4afe-96ae-524d0ccbb7a2"
				]
			},
			{
				"appId": "1fec8e78-bce4-4aaf-ab1b-5451cc387264",
				"delegatedPermissionIds": [
					"d167fa29-cd2d-4afe-96ae-524d0ccbb7a2"
				]
			}
		]
	},
	"appRoles": [],
	"info": {
		"logoUrl": null,
		"marketingUrl": null,
		"privacyStatementUrl": null,
		"supportUrl": null,
		"termsOfServiceUrl": null
	},
	"keyCredentials": [],
	"parentalControlSettings": {
		"countriesBlockedForMinors": [],
		"legalAgeGroupRule": "Allow"
	},
	"passwordCredentials": [
		{
			"customKeyIdentifier": null,
			"displayName": "HWM-401k-Secret",
			"endDateTime": "2026-01-02T08:28:02.354Z",
			"hint": "ECI",
			"keyId": "d46dbf2c-2026-41c4-b5ab-2e28e979316c",
			"secretText": null,
			"startDateTime": "2025-07-06T07:28:02.354Z"
		}
	],
	"publicClient": {
		"redirectUris": []
	},
	"requiredResourceAccess": [
		{
			"resourceAppId": "00000003-0000-0000-c000-000000000000",
			"resourceAccess": [
				{
					"id": "e1fe6dd8-ba31-4d61-89e7-88639da4683d",
					"type": "Scope"
				}
			]
		}
	],
	"verifiedPublisher": {
		"displayName": null,
		"verifiedPublisherId": null,
		"addedDateTime": null
	},
	"web": {
		"homePageUrl": null,
		"logoutUrl": null,
		"redirectUris": [
			"https://green-rock-024c27f1e.1.azurestaticapps.net/.auth/login/aad/callback",
			"https://green-rock-024c27f1e.1.azurestaticapps.net/"
		],
		"implicitGrantSettings": {
			"enableAccessTokenIssuance": true,
			"enableIdTokenIssuance": true
		},
		"redirectUriSettings": [
			{
				"uri": "https://green-rock-024c27f1e.1.azurestaticapps.net/.auth/login/aad/callback",
				"index": null
			},
			{
				"uri": "https://green-rock-024c27f1e.1.azurestaticapps.net/",
				"index": null
			}
		]
	},
	"servicePrincipalLockConfiguration": {
		"isEnabled": true,
		"allProperties": true,
		"credentialsWithUsageVerify": true,
		"credentialsWithUsageSign": true,
		"identifierUris": false,
		"tokenEncryptionKeyId": true
	},
	"spa": {
		"redirectUris": [
			"http://localhost:5173"
		]
	}
}
