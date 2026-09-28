# Synthetic SOC dataset: Kestrel Logistics (fictional)
Total alerts: **800** | history (days 1-20): 514 | replay (days 21-30): 286
Variants: {'recurring_benign': 720, 'lookalike': 64, 'attack': 16}
Verdicts: {'BenignPositive': 649, 'FalsePositive': 110, 'TruePositive': 41}

**Killer story:** ALRT-00663 at 2026-08-26T02:14:00 - 500 GB from db-prod-01 to 194.193.192.201. Same host/window/size as the nightly backup, but external destination, no scheduled job, unfamiliar initiator, sensitive data.

## Files
- `alerts.json`: what the agent sees. History alerts include analyst, note, verdict, outcome. Replay alerts are open.
- `ground_truth.json`: evaluation only (variant, should_escalate, context_differences, the analyst note to use when simulating a resolution).
- `company.json`: employees, servers, analysts, jobs, travel calendar.

## Variants
- `recurring_benign`: harmless repeat, context fully matches history (memory reuse is safe).
- `lookalike`: looks like a known harmless pattern but 1+ context signals differ (should escalate; a human then confirms benign or real).
- `attack`: real attack (3+ context signals differ).

## Scenarios
| Scenario | Harmless version | Look-alike kinds | Real attack |
|---|---|---|---|
| big_transfer | Matches scheduled job {scheduled_job} ({host} -> {dst}, {bytes_gb} GB,... | new_destination, no_job, double_volume, external_destination | Looked like the nightly backup (same host, same window, ~{bytes_gb} GB) but dest... |
| foreign_login | {user} is on an approved trip to {city} ({purpose}) per the travel cal... | no_calendar_entry, new_device, odd_hours | No travel on record for {user}; sign-in from {city} on an unknown device, MFA no... |
| admin_powershell | IT admin {user} ran the approved patch script on {host} under {change_... | no_ticket, encoded_command, unknown_source_host | Encoded PowerShell with a download cradle spawned from Word by non-admin {user};... |
| failed_logins | {user} mistyped the password {attempts} times, then signed in from the... | new_ip, many_attempts, few_accounts | {attempts} attempts across {accounts_targeted} accounts from {src} ({source_coun... |
| mass_download | {user} downloaded project files ({gb} GB) to a company laptop for repo... | notice_period, usb_copy, confidential_data | Employee in notice period bulk-copied customer PII ({gb} GB) to personal cloud s... |
| new_admin_account | New-joiner account {new_account} created by IT admin {user} under {onb... | no_ticket, domain_admin_group, after_hours | Account {new_account} created at {hour} by non-admin {user}, no ticket, added to... |
| two_country_login | Both sign-ins came from {user}'s laptop; the second exited through the... | personal_phone, no_mfa, not_via_vpn | Simultaneous sign-ins from India and {country_b} {gap_minutes} minutes apart; th... |
| port_scan | Weekly authorized vulnerability scan {scheduled_scan} from scan-srv-01... | outside_window, unregistered_scanner, wider_range | Ordinary workstation {host} scanned the internal network for SMB/RDP at night; i... |
| email_forwarding | Out-of-office forwarding to an internal colleague while {user} is on l... | external_partner, no_leave_record, new_device | Hidden rule forwards mail matching invoice/payment/wire to {forward_to}, created... |
| public_storage | Marketing published campaign assets under {change_ticket}; container h... | no_ticket, mixed_content, no_expiry | Container {container} holding customer PII exports was made public with no ticke... |
