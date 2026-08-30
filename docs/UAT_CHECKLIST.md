# UAT / CAB Checklist

Use this checklist before approving changes to the Partner Integration Management app.

| Area | Scenario | Expected result |
| --- | --- | --- |
| Partner | Create partner with name only | Partner is saved, connection remains Draft / Not Established, and request can receive a VPN form later. |
| Partner | Import VPN form while creating partner | Company data, peer IPs and private endpoints are populated, then a create connection request is available for validation. |
| Connection | Create request reaches signed statement | Connection stays Awaiting Approval until signatures are complete and implementation starts. |
| Connection | IP Core and IT finish on different days | Request remains in Implementation until both IP Core and IT are Done. |
| Testing | VPN, UAT connectivity, PRD connectivity and API/UAT pass | Connection becomes Live / Healthy only after all required tests and UAT pass. |
| Update | Open update request on healthy connection | Connection remains Healthy until tests fail or the update closes successfully. |
| Update | Update request closes successfully | New form data becomes the official connection technical profile. |
| Risk | Connectivity or UAT fails | Request moves to Troubleshooting and connection health becomes Down or Degraded. |
| Control | Block and unblock request | Reason is captured in an app modal; unblock uses an app modal and keeps the same request. |
| Security | Provide test credentials | Credentials are captured in a modal, visible in the request, and printable only when explicitly included. |
| Language | Switch EN/PT | Navigation, actions, labels, modals, statuses and messages switch language consistently. |
| Responsive | Laptop and desktop resolution | Partner list, request detail and pipeline do not require hidden horizontal page scrolling. |
