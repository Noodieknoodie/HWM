import * as microsoftTeams from "@microsoft/teams-js";

let teamsInitialized = false;
let initPromise: Promise<void> | null = null;

export async function initializeTeams(): Promise<void> {
  if (teamsInitialized) return;
  if (initPromise) return initPromise;
  
  initPromise = new Promise((resolve, reject) => {
    microsoftTeams.app.initialize().then(() => {
      teamsInitialized = true;
      resolve();
    }).catch(reject);
  });
  
  return initPromise;
}

export function isInTeams(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  const hasTeamsParams = urlParams.has('entityId') || urlParams.has('subEntityId');
  const hasTeamsUserAgent = /Teams/i.test(navigator.userAgent);
  const inIframe = window.self !== window.top;
  
  return hasTeamsParams || hasTeamsUserAgent || inIframe;
}

export async function getTeamsAuthToken(): Promise<string> {
  await initializeTeams();
  
  return new Promise((resolve, reject) => {
    microsoftTeams.authentication.getAuthToken({
      successCallback: (token) => resolve(token),
      failureCallback: (err) => reject(new Error(err))
    });
  });
}