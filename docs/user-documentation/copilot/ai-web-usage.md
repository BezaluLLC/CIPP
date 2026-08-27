# AI Web Usage

AI Web Usage identifies known AI services accessed from devices protected by Microsoft Defender for
Endpoint. It uses the Microsoft Graph security hunting API over the `DeviceNetworkEvents` table and
matches the reported remote hosts against the curated Shadow AI catalog.

This is a separate view from [Shadow AI Discovery](shadow-ai.md):

* **Shadow AI Discovery** combines cached Intune software inventory with Entra application consent.
* **AI Web Usage** reports endpoint network connections to catalogued AI service domains.

## Requirements and limitations

The report is designed for Microsoft 365 Business Premium environments. It uses Microsoft Defender
for Business endpoint telemetry and does **not** use Microsoft Defender for Cloud Apps Cloud Discovery,
`CloudAppEvents`, firewall log uploads, or Cloud App Security APIs.

Devices must be onboarded to Microsoft Defender for Endpoint and reporting network events. No page
content, request bodies, traffic volume, or full URLs are collected by the report; only the remote
host, timestamp, device, user, process name, protocol, and connection type are shown.

The CIPP-SAM app also needs the Microsoft Graph `ThreatHunting.Read.All` application permission to
run the read-only hunting query. This permission provides access to the query surface; it does not
add a Defender product license.

The Graph hunting API retains up to 30 days of native Defender data, so the report supports seven-day
and 30-day views. Results are limited to the first 10,000 matching network events; when that limit is
reached, the displayed counts are a lower bound. A tenant with no matching rows should confirm device
onboarding and endpoint network telemetry before treating the result as evidence of no AI web usage.

The report applies the same company-sanctioned status and catalog risk adjustment as Shadow AI
Discovery. Domain mappings are intentionally explicit to avoid treating broad words such as
"copilot" or "openai" as reliable network indicators.
