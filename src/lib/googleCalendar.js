// lib/googleCalendar.js

/**
 * Requests calendar access using Google Identity Services (GSI)
 * @param {string} clientId The Google OAuth client ID
 * @returns {Promise<string>} Promise that resolves with the access token
 */
export function requestCalendarAccess(clientId) {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      reject(new Error("Google Identity Services client library is not loaded."));
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/calendar.events",
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
          } else if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error("No access token returned."));
          }
        },
      });
      client.requestAccessToken();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Fetches calendar events from Google Calendar API
 * @param {string} accessToken OAuth access token
 * @returns {Promise<Array>} List of formatted calendar events
 */
export async function fetchCalendarEvents(accessToken) {
  const now = new Date().toISOString();
  const max = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.append("timeMin", now);
  url.searchParams.append("timeMax", max);
  url.searchParams.append("singleEvents", "true");
  url.searchParams.append("orderBy", "startTime");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Failed to fetch calendar events: ${res.status}`);
  }

  const data = await res.json();
  const items = data.items || [];
  
  return items.map((item) => ({
    id: item.id,
    title: item.summary || "(No Title)",
    date: item.start.dateTime || item.start.date,
    type: "calendar",
  }));
}

/**
 * Creates a new calendar event
 * @param {string} accessToken OAuth access token
 * @param {string} title Event title
 * @param {string} dateTimeISO Event start date-time in ISO format
 * @returns {Promise<Object>} Created event response
 */
export async function createCalendarEvent(accessToken, title, dateTimeISO) {
  const start = new Date(dateTimeISO);
  if (isNaN(start.getTime())) {
    throw new Error("Invalid start date/time");
  }
  
  const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const body = {
    summary: title,
    start: {
      dateTime: start.toISOString(),
      timeZone,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: 30 }],
    },
  };

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Failed to create calendar event: ${res.status}`);
  }

  return res.json();
}
