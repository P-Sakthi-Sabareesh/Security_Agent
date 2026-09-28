#!/usr/bin/env python3
"""Synthetic SOC dataset for a fictional company (Kestrel Logistics). Seeded and reproducible.
Outputs: company.json, alerts.json, ground_truth.json, scenarios.md
Days 1-20 = history (analyst notes + verdicts, store in memory). Days 21-30 = replay (test).
ground_truth.json is for evaluation ONLY (never feed it to the agent before it decides)."""
import json, random, copy, datetime as dt, collections, os

R = random.Random(42)
START, N_DAYS, HIST = dt.date(2026, 8, 1), 30, 20
OUT = os.path.dirname(os.path.abspath(__file__))

FN = ("Aarav Priya Rahul Ananya Karthik Divya Vikram Meera Arjun Sneha Rohan Kavya Imran Nisha Sanjay Lakshmi "
      "Amit Pooja Suresh Deepa Naveen Ritu Manoj Swathi Farhan Anjali Gautam Isha Harsha Tanvi Varun Shreya "
      "Ashwin Bhavna Dev Ekta Kiran Leena Mohan Nandini").split()
LN = "Nair Reddy Iyer Sharma Menon Patel Rao Kapoor Das Pillai Singh Joshi Khan Gupta Kumar Verma Bose Naidu Shetty Mehta".split()
CITIES = ["Chennai", "Hyderabad", "Bengaluru", "Mumbai", "Pune", "Delhi"]
ROLES = [("Software Engineer", "Engineering"), ("Finance Analyst", "Finance"), ("HR Manager", "HR"),
         ("Sales Executive", "Sales"), ("Legal Counsel", "Legal"), ("Operations Manager", "Operations"),
         ("Customer Support", "Support")]

names = [(f, l) for f in FN for l in LN]
R.shuffle(names)
EMP = []
for i, (f, l) in enumerate(names[:60]):
    if i < 6: role, dept = "IT Admin", "IT"
    elif i < 9: role, dept = "DBA", "IT"
    elif i < 12: role, dept = "Marketing Lead", "Marketing"
    else: role, dept = R.choice(ROLES)
    EMP.append(dict(user=f"{f}.{l}".lower(), name=f"{f} {l}", role=role, dept=dept, city=R.choice(CITIES),
                    laptop=f"LT-{i+1:04d}", ip=f"10.20.{i//250}.{i%250+10}"))
EMPD = {e["user"]: e for e in EMP}
ADMINS = [e for e in EMP if e["role"] == "IT Admin"]
SRV = {n: f"10.0.{k}.{10+i}" for i, (n, k) in enumerate([
    ("backup-srv-01", 5), ("backup-srv-02", 5), ("vpn-gw-01", 2), ("db-prod-01", 3), ("db-prod-02", 3),
    ("file-srv-01", 4), ("file-srv-02", 4), ("web-prod-01", 6), ("web-prod-02", 6), ("ad-dc-01", 1),
    ("ad-dc-02", 1), ("mail-gw-01", 2), ("scan-srv-01", 7), ("hr-app-01", 8), ("build-srv-01", 9)])}
PROD = ["db-prod-01", "db-prod-02", "file-srv-01", "file-srv-02", "web-prod-01", "web-prod-02", "hr-app-01"]
ANALYSTS = [
    dict(id="A01", name="Priya Nair", favored=["foreign_login", "two_country_login"]),
    dict(id="A02", name="Rahul Menon", favored=["big_transfer", "public_storage", "mass_download"]),
    dict(id="A03", name="Ananya Iyer", favored=["failed_logins", "new_admin_account"]),
    dict(id="A04", name="Karthik Rao", favored=["admin_powershell", "port_scan"]),
    dict(id="A05", name="Divya Shetty", favored=["email_forwarding", "foreign_login"]),
    dict(id="A06", name="Imran Khan", favored=["two_country_login", "mass_download", "port_scan"])]

tp_emps = R.sample([e for e in EMP if e["role"] not in ("IT Admin", "DBA")], 12)
starts = [R.randint(1, 12) for _ in range(6)] + [R.randint(14, 27) for _ in range(6)]
TRIPS = []
for e, s in zip(tp_emps, starts):
    c, k = R.choice([("Singapore", "SG"), ("Dubai", "AE"), ("London", "GB"), ("Frankfurt", "DE"), ("New York", "US")])
    TRIPS.append(dict(user=e["user"], city=c, country=k, start=s, end=min(30, s + R.randint(2, 6)),
                      purpose=R.choice(["client visit", "conference", "vendor audit", "team offsite", "customer onboarding"])))

def ext_ip(): return f"{R.choice([45, 91, 103, 185, 194, 5, 77, 141])}.{R.randint(1,254)}.{R.randint(1,254)}.{R.randint(1,254)}"
ATT_GEO = [("Bucharest", "RO"), ("Lagos", "NG"), ("Hanoi", "VN"), ("Sao Paulo", "BR"), ("Moscow", "RU")]
def geo():
    c, k = R.choice(ATT_GEO)
    return dict(city=c, country=k, device="unknown browser", mfa="not required (legacy auth)", purpose="none on record")
def anyemp(): return R.choice(EMP)

# ---------------- scenario specs: benign base + look-alikes + real attack ----------------
def bt(day, i):
    job, h, dst, gr, hr = [("BK-NIGHTLY-01", "db-prod-01", "backup-srv-02", (420, 530), 2),
                           ("BK-NIGHTLY-02", "file-srv-01", "backup-srv-01", (180, 260), 3)][i % 2]
    return dict(user="svc-backup", host=h, src=SRV[h], dst=dst, hour=hr,
                details=dict(bytes_gb=R.randint(*gr), protocol="SMB", initiated_from="backup-orchestrator-01"),
                ctx=dict(scheduled_job=job, within_job_window=True, destination_in_inventory=True,
                         account_normal_for_action=True, sensitive_data_involved=False),
                note="Matches scheduled job {scheduled_job} ({host} -> {dst}, {bytes_gb} GB, inside the backup window). Same as previous nights. Closed as expected backup.")

def ft(day, i):
    act = [t for t in TRIPS if t["start"] <= day <= t["end"]] or TRIPS
    t = act[i % len(act)]; e = EMPD[t["user"]]
    return dict(user=e["user"], host=e["laptop"], src=ext_ip(), dst="Microsoft 365 sign-in", hour=R.randint(3, 12),
                details=dict(city=t["city"], country=t["country"], device="company laptop", mfa="passed", purpose=t["purpose"]),
                ctx=dict(known_device=True, travel_on_calendar=True, mfa_passed=True, login_hours_normal=True, sensitive_data_accessed=False),
                note="{user} is on an approved trip to {city} ({purpose}) per the travel calendar. Company laptop {host}, MFA passed, normal working hours. Closed as expected.")

def ps(day, i):
    a = R.choice(ADMINS)
    return dict(user=a["user"], host=R.choice(PROD), src=a["ip"], dst="local", hour=R.choice([10, 11, 14, 15, 22, 23]),
                details=dict(command="powershell.exe -File C:\\Ops\\Install-Updates.ps1", parent="ansible-runner"),
                ctx=dict(change_ticket=f"CHG-{R.randint(1000,9999)}", account_is_it_admin=True, command_encoded=False,
                         source_host_known=True, within_change_window=True),
                note="IT admin {user} ran the approved patch script on {host} under {change_ticket}, inside the change window. Closed benign.")

def fl(day, i):
    e = anyemp(); w = (START + dt.timedelta(days=day - 1)).weekday()
    return dict(user=e["user"], host=e["laptop"], src=e["ip"], dst="Entra ID sign-in", hour=R.randint(8, 10) if w == 0 else R.randint(8, 17),
                details=dict(attempts=R.randint(5, 9), accounts_targeted=1, source_country="IN", then_success=True),
                ctx=dict(single_account=True, source_known_ip=True, success_from_same_device=True, source_country_normal=True),
                note="{user} mistyped the password {attempts} times, then signed in from the usual device and IP (typical after a weekend). Closed benign.")

def md(day, i):
    e = anyemp()
    return dict(user=e["user"], host=e["laptop"], src=e["ip"], dst="sharepoint/Projects", hour=R.randint(10, 17),
                details=dict(gb=round(R.uniform(2, 5), 1), files=R.randint(400, 1500), destination="company laptop"),
                ctx=dict(manager_approved=True, employment_status="active", data_classification="internal", destination_managed_device=True),
                note="{user} downloaded project files ({gb} GB) to a company laptop for reporting/handover, manager-approved, no HR flags. Closed benign.")

def na(day, i):
    a = R.choice(ADMINS); f, l = R.choice(FN), R.choice(LN)
    return dict(user=a["user"], host="ad-dc-01", src=a["ip"], dst="ad-dc-01", hour=R.randint(9, 17),
                details=dict(new_account=f"{f}.{l}".lower(), group="Helpdesk-Operators"),
                ctx=dict(onboarding_ticket=f"HR-{R.randint(1000,9999)}", created_by_it_admin=True, business_hours=True, group_is_standard=True),
                note="New-joiner account {new_account} created by IT admin {user} under {onboarding_ticket}, standard groups, business hours. Closed benign.")

def tc(day, i):
    e = anyemp()
    return dict(user=e["user"], host=e["laptop"], src=SRV["vpn-gw-01"], dst="Microsoft 365 sign-in", hour=R.randint(6, 20),
                details=dict(country_a="IN", country_b=R.choice(["SG", "DE", "US", "NL"]), gap_minutes=R.randint(2, 20), via_vpn=True),
                ctx=dict(vpn_exit_node=True, known_device=True, mfa_passed=True, same_device_both=True),
                note="Both sign-ins came from {user}'s laptop; the second exited through the company VPN gateway in {country_b}. Detector misread VPN geolocation. Closed benign.")

def sc_(day, i):
    return dict(user="scan-svc", host="scan-srv-01", src=SRV["scan-srv-01"], dst=f"10.0.{R.randint(1,9)}.0/24", hour=R.randint(1, 3),
                details=dict(ports_scanned=R.randint(100, 1000), hosts_probed=R.randint(50, 250)),
                ctx=dict(scanner_registered=True, within_scan_window=True, scheduled_scan="VS-WEEKLY-01", source_is_it_asset=True),
                note="Weekly authorized vulnerability scan {scheduled_scan} from scan-srv-01 inside the Sunday window. Closed benign.")

def ef(day, i):
    e = anyemp(); c = anyemp()
    return dict(user=e["user"], host=e["laptop"], src=e["ip"], dst="Exchange Online", hour=R.randint(9, 17),
                details=dict(forward_to=f"{c['user']}@kestrel.example", rule_scope="all mail", duration="until return"),
                ctx=dict(forward_target_internal=True, user_on_leave=True, created_from_known_device=True, keyword_filter=False),
                note="Out-of-office forwarding to an internal colleague while {user} is on leave, created from a known laptop. Closed benign.")

def ps_store(day, i):
    m = R.choice([e for e in EMP if e["role"] == "Marketing Lead"])
    return dict(user=m["user"], host="azure-portal", src=m["ip"], dst=f"stkestrel{R.randint(10,99)}", hour=R.randint(9, 17),
                details=dict(container=f"campaign-assets-{R.randint(100,999)}", contents="public marketing assets"),
                ctx=dict(change_ticket=f"CHG-{R.randint(1000,9999)}", data_classification="public", created_by_marketing=True, expiry_set=True),
                note="Marketing published campaign assets under {change_ticket}; container holds only public material. Closed benign.")

def L(kind, ov, tp, nb, nt): return dict(kind=kind, ov=ov, tp=tp, nb=nb, nt=nt)

SPEC = {
 "big_transfer": dict(title="Large outbound data transfer", category="Exfiltration", mitre="T1048", det="DET-NET-031", benign=bt,
   looks=[L("new_destination", dict(dst="backup-srv-03", ctx=dict(destination_in_inventory=False)), .05,
            "Destination {dst} is not in the asset inventory, but job {scheduled_job} ran on schedule. IT confirmed backup-srv-03 was provisioned this week (CHG-{n}). Benign; inventory updated.",
            "Destination {dst} unknown and absent from change records. Escalated to IR; transfer blocked."),
          L("no_job", dict(hour=lambda: R.randint(13, 16), ctx=dict(scheduled_job=None, within_job_window=False)), .5,
            "No scheduled job at {hour}. Owner confirmed a manual restore test (CHG-{n}). Benign.",
            "No scheduled job, no ticket, and the owner denied running it. Escalated to IR."),
          L("double_volume", dict(details=dict(bytes_gb=lambda: R.randint(900, 1100))), .3,
            "Volume ({bytes_gb} GB) is about double normal. DBA added new tables last week; job unchanged. Benign.",
            "Volume about double normal and part of it went to a second unknown destination. Escalated."),
          L("external_destination", dict(dst=ext_ip, ctx=dict(destination_in_inventory=False, scheduled_job=None)), .9,
            "External destination {dst} was a vendor's approved migration endpoint (CHG-{n}). Benign.",
            "Transfer to external IP {dst} with no job or approval. Escalated to IR; egress blocked; credentials rotated.")],
   attack=dict(sev="Medium", note="Looked like the nightly backup (same host, same window, ~{bytes_gb} GB) but destination {dst} is external, no scheduled job exists, the service account was used from an unfamiliar host ({initiated_from}), and customer data was involved. Confirmed exfiltration. IR opened; egress blocked; credentials rotated; host isolated.",
     ov=dict(host="db-prod-01", src=SRV["db-prod-01"], dst=ext_ip, hour=2, minute=14, details=dict(bytes_gb=500, initiated_from="build-srv-01"),
             ctx=dict(scheduled_job=None, within_job_window=True, destination_in_inventory=False, account_normal_for_action=False, sensitive_data_involved=True)))),
 "foreign_login": dict(title="Sign-in from unfamiliar country", category="InitialAccess", mitre="T1078", det="DET-ID-002", benign=ft,
   looks=[L("no_calendar_entry", dict(actor="nonit", ctx=dict(travel_on_calendar=False)), .25,
            "No calendar entry for {city}, but the manager confirmed a personal trip on the company laptop; MFA passed. Benign; user reminded to log travel.",
            "No travel record and the user says they are not travelling. Password reset and sessions revoked."),
          L("new_device", dict(host="unenrolled-phone", ctx=dict(known_device=False), details=dict(device="unenrolled phone")), .3,
            "Trip is on the calendar. Sign-in came from the user's new personal phone; user confirmed and enrolled it. Benign.",
            "Trip is on the calendar but the sign-in came from a device the user did not recognize. Sessions revoked, password reset."),
          L("odd_hours", dict(hour=lambda: R.choice([0, 1, 22, 23]), ctx=dict(login_hours_normal=False)), .3,
            "Trip is on the calendar; the late sign-in was a timezone/jet-lag effect, user confirmed. Benign.",
            "Trip on the calendar, but a late-night sign-in from an unfamiliar browser was followed by mailbox-rule creation. Escalated.")],
   attack=dict(note="No travel on record for {user}; sign-in from {city} on an unknown device, MFA not required (legacy auth), odd hour, then bulk downloads from the finance share. Account compromised. Password reset, sessions revoked, IR opened.",
     ov=dict(actor="nonit", host="unknown-device", src=ext_ip, hour=lambda: R.choice([1, 2, 3]), details=geo,
             ctx=dict(known_device=False, travel_on_calendar=False, mfa_passed=False, login_hours_normal=False, sensitive_data_accessed=True)))),
 "admin_powershell": dict(title="Suspicious PowerShell command executed", category="Execution", mitre="T1059.001", det="DET-EP-014", benign=ps,
   looks=[L("no_ticket", dict(ctx=dict(change_ticket=None)), .3,
            "Usual patch routine; the admin forgot to link the change ticket and filed it retroactively. Benign.",
            "No change ticket and the admin denies running it. Escalated; account disabled pending review."),
          L("encoded_command", dict(details=dict(command="powershell.exe -enc JABzAD0ATgBlAHcALQBPAGIAagBlAGMAdAA...")), ctx=None) if False else
          L("encoded_command", dict(ctx=dict(command_encoded=True), details=dict(command="powershell.exe -enc JABzAD0ATgBlAHcALQBPAGIAagBlAGMAdAA...")), .35,
            "The encoded command came from the automation tool IT rolled out this week; owner confirmed. Benign.",
            "Encoded command not tied to any known tooling. Escalated to IR."),
          L("unknown_source_host", dict(ctx=dict(source_host_known=False)), .4,
            "Admin worked from a loaner laptop during an outage; manager confirmed. Benign.",
            "Script launched from an unknown host. Escalated to IR.")],
   attack=dict(note="Encoded PowerShell with a download cradle spawned from Word by non-admin {user}; no change ticket; unknown source host. Malicious macro execution confirmed. Host isolated, account reset, IR opened.",
     ov=dict(actor="nonit", dst="local", hour=lambda: R.choice([2, 3, 4]),
             details=dict(command="powershell.exe -nop -w hidden -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQA...", parent="winword.exe"),
             ctx=dict(change_ticket=None, account_is_it_admin=False, command_encoded=True, source_host_known=False, within_change_window=False)))),
 "failed_logins": dict(title="Multiple failed sign-in attempts", category="CredentialAccess", mitre="T1110", det="DET-AUTH-007", benign=fl, fp=.3,
   fp_note="{attempts} failed attempts is within this user's normal behavior; detector threshold too sensitive. False positive.",
   looks=[L("new_ip", dict(ctx=dict(source_known_ip=False)), .3,
            "Failures came from the user's home broadband (new IP); user confirmed; MFA passed. Benign.",
            "Failures from an unfamiliar IP followed by a success without MFA. Password reset, sessions revoked."),
          L("many_attempts", dict(details=dict(attempts=lambda: R.randint(25, 40))), .3,
            "Password-manager retry loop after a password change; user confirmed. Benign.",
            "Sustained repeated attempts on one account from an unfamiliar IP. Escalated; account locked."),
          L("few_accounts", dict(details=dict(accounts_targeted=3), ctx=dict(single_account=False)), .5,
            "Three shared-mailbox accounts of one team locked out by an old mobile client; client fixed. Benign.",
            "Same source hit three accounts in sequence. Escalated as password spraying.")],
   attack=dict(sev="High", note="{attempts} attempts across {accounts_targeted} accounts from {src} ({source_country}) with one success. Password-spray attack. Account reset, IP blocked, IR opened.",
     ov=dict(user="multiple (31 accounts)", host="external", src=ext_ip, details=dict(attempts=412, accounts_targeted=31, source_country="VN"),
             ctx=dict(single_account=False, source_known_ip=False, success_from_same_device=False, source_country_normal=False)))),
 "mass_download": dict(title="Unusual volume of file downloads", category="Collection", mitre="T1039", det="DET-DLP-021", benign=md,
   looks=[L("notice_period", dict(ctx=dict(employment_status="notice_period")), .5,
            "User in notice period doing an approved handover; manager and HR confirmed. Benign.",
            "User in notice period downloading beyond handover scope. Escalated to HR/IR."),
          L("usb_copy", dict(details=dict(destination="USB drive"), ctx=dict(destination_managed_device=False)), .4,
            "Copy to an encrypted company USB approved for an offline customer demo. Benign.",
            "Bulk copy to an unencrypted personal USB with no approval. Escalated."),
          L("confidential_data", dict(ctx=dict(data_classification="confidential")), .3,
            "Finance quarter-close export authorized by the CFO office. Benign.",
            "Confidential data copied without approval. Escalated.")],
   attack=dict(note="Employee in notice period bulk-copied customer PII ({gb} GB) to personal cloud storage with no approval. Insider data theft confirmed. Access revoked; HR and legal engaged.",
     ov=dict(actor="nonit", hour=lambda: R.choice([18, 19, 21]), details=dict(gb=38.0, files=22000, destination="personal cloud storage"),
             ctx=dict(manager_approved=False, employment_status="notice_period", data_classification="customer_pii", destination_managed_device=False)))),
 "new_admin_account": dict(title="New privileged account created", category="Persistence", mitre="T1136.001", det="DET-IAM-003", benign=na,
   looks=[L("no_ticket", dict(ctx=dict(onboarding_ticket=None)), .3,
            "Urgent contractor onboarding; ticket filed later. Benign.",
            "No ticket and the requester is unknown. Account disabled, escalated."),
          L("domain_admin_group", dict(details=dict(group="Domain Admins"), ctx=dict(group_is_standard=False)), .4,
            "Temporary Domain Admin for a scheduled migration, approved by the CISO. Benign.",
            "Privileged group membership with no approval. Escalated."),
          L("after_hours", dict(hour=lambda: R.choice([20, 21, 22, 23]), ctx=dict(business_hours=False)), .3,
            "Created inside an approved weekend maintenance window. Benign.",
            "Created off-hours with no maintenance window. Escalated.")],
   attack=dict(sev="Critical", note="Account {new_account} created at {hour} by non-admin {user}, no ticket, added to Domain Admins. Attacker persistence via a compromised account. Account disabled, IR opened.",
     ov=dict(actor="nonit", dst="ad-dc-01", hour=3, details=dict(new_account="svc-update", group="Domain Admins"),
             ctx=dict(onboarding_ticket=None, created_by_it_admin=False, business_hours=False, group_is_standard=False)))),
 "two_country_login": dict(title="Impossible travel activity", category="InitialAccess", mitre="T1078", det="DET-ID-011", benign=tc, fp=.5,
   fp_note="VPN exit-node geolocation false positive: both sign-ins were the same laptop via the company VPN.",
   looks=[L("personal_phone", dict(ctx=dict(same_device_both=False, known_device=False)), .3,
            "Second sign-in from the user's personal phone on roaming data; user confirmed. Benign.",
            "Second sign-in from a device the user cannot identify. Sessions revoked."),
          L("no_mfa", dict(ctx=dict(mfa_passed=False)), .4,
            "Legacy mail client bypasses MFA; user confirmed both sign-ins. Benign; client being migrated.",
            "Second sign-in skipped MFA from an unknown client. Escalated."),
          L("not_via_vpn", dict(ctx=dict(vpn_exit_node=False), details=dict(via_vpn=False)), .5,
            "User connected through a hotel VPN app; confirmed. Benign.",
            "Second sign-in from a non-corporate IP in another country. Escalated.")],
   attack=dict(note="Simultaneous sign-ins from India and {country_b} {gap_minutes} minutes apart; the second came from an unknown device with no MFA and no VPN. Account compromised. Sessions revoked, password reset, IR opened.",
     ov=dict(src=ext_ip, details=lambda: dict(country_b=R.choice(ATT_GEO)[1], via_vpn=False, gap_minutes=4),
             ctx=dict(vpn_exit_node=False, known_device=False, mfa_passed=False, same_device_both=False)))),
 "port_scan": dict(title="Network scanning activity detected", category="Discovery", mitre="T1046", det="DET-NET-019", benign=sc_,
   looks=[L("outside_window", dict(hour=14, ctx=dict(within_scan_window=False, scheduled_scan=None)), .3,
            "Ad-hoc scan requested by the security lead for an audit (SEC-{n}). Benign.",
            "Scan outside the window with no request. Escalated."),
          L("unregistered_scanner", dict(host="scan-srv-02", ctx=dict(scanner_registered=False)), .4,
            "New scanner trialed by IT; registered afterwards. Benign.",
            "Scanner not in inventory. Escalated."),
          L("wider_range", dict(details=dict(hosts_probed=lambda: R.randint(3000, 4500))), .3,
            "Scope widened after a new office network was added; approved. Benign.",
            "Scan reached segments outside its approved scope. Escalated.")],
   attack=dict(note="Ordinary workstation {host} scanned the internal network for SMB/RDP at night; it is not a registered scanner. Compromised workstation. Host isolated, IR opened.",
     ov=dict(actor="nonit", dst="10.0.0.0/16", hour=23, details=dict(ports_scanned=3, hosts_probed=4200),
             ctx=dict(scanner_registered=False, within_scan_window=False, scheduled_scan=None, source_is_it_asset=False)))),
 "email_forwarding": dict(title="Suspicious inbox forwarding rule", category="Collection", mitre="T1114.003", det="DET-MAIL-005", benign=ef,
   looks=[L("external_partner", dict(details=dict(forward_to="accounts@vendor-partner.example"), ctx=dict(forward_target_internal=False)), .3,
            "Forwarding to an approved vendor mailbox during a handover; manager confirmed. Benign.",
            "External recipient not on the approved list. Rule removed, escalated."),
          L("no_leave_record", dict(ctx=dict(user_on_leave=False)), .2,
            "User forwarding to a shared team mailbox for coverage; harmless. Benign.",
            "No leave record and the rule was hidden. Escalated."),
          L("new_device", dict(ctx=dict(created_from_known_device=False)), .4,
            "Created from the user's new tablet; user confirmed. Benign.",
            "Created from an unknown device. Escalated.")],
   attack=dict(note="Hidden rule forwards mail matching invoice/payment/wire to {forward_to}, created from an unfamiliar IP right after an unusual-country login. Business email compromise. Rule deleted, credentials reset, IR opened.",
     ov=dict(src=ext_ip, details=dict(forward_to="j.smith.backup@freemail-mail.example", rule_scope="keywords: invoice, payment, wire", duration="permanent"),
             ctx=dict(forward_target_internal=False, user_on_leave=False, created_from_known_device=False, keyword_filter=True)))),
 "public_storage": dict(title="Cloud storage container exposed publicly", category="Collection", mitre="T1530", det="DET-CLD-008", benign=ps_store,
   looks=[L("no_ticket", dict(ctx=dict(change_ticket=None)), .3,
            "Ticket filed after the fact; content verified as public. Benign.",
            "No ticket and the owner was unaware of the exposure. Made private, escalated."),
          L("mixed_content", dict(ctx=dict(data_classification="mixed")), .5,
            "Some internal PDFs found and removed; no customer data. Benign.",
            "Container held internal documents; made private and escalated."),
          L("no_expiry", dict(ctx=dict(expiry_set=False)), .1,
            "Public access is intended; expiry added. Benign.",
            "Public access without expiry on a container the owner cannot explain. Escalated.")],
   attack=dict(note="Container {container} holding customer PII exports was made public with no ticket by a non-marketing account and accessed from external IPs. Made private, IR opened, breach assessment started.",
     ov=dict(actor="nonit", host="azure-portal", dst=lambda: f"stkestrel{R.randint(10,99)}", details=dict(contents="customer exports (PII)"),
             ctx=dict(change_ticket=None, data_classification="customer_pii", created_by_marketing=False, expiry_set=False)))),
}
SCHED = {
 "big_transfer": lambda d, w: 2,
 "foreign_login": lambda d, w: len([t for t in TRIPS if t["start"] <= d <= t["end"]]),
 "admin_powershell": lambda d, w: R.randint(4, 7) if w < 5 else R.randint(0, 1),
 "failed_logins": lambda d, w: R.randint(10, 14) if w == 0 else (R.randint(2, 5) if w < 5 else R.randint(0, 1)),
 "mass_download": lambda d, w: R.randint(2, 3) if w < 5 else 0,
 "new_admin_account": lambda d, w: R.randint(1, 2) if w < 5 else 0,
 "two_country_login": lambda d, w: R.randint(4, 5),
 "port_scan": lambda d, w: R.randint(10, 14) if w == 6 else 0,
 "email_forwarding": lambda d, w: R.randint(0, 4),
 "public_storage": lambda d, w: R.randint(0, 3)}
LOOK_N = {"big_transfer": 7, "foreign_login": 7, "admin_powershell": 7, "failed_logins": 7}
ATT_HIST = {"foreign_login", "admin_powershell", "failed_logins", "new_admin_account", "port_scan", "public_storage"}

class D(dict):
    def __missing__(self, k): return "{" + k + "}"

def apply(a, ov):
    if "actor" in ov:
        pool = [x for x in EMP if x["role"] not in ("IT Admin", "DBA")] if ov["actor"] == "nonit" else EMP
        e = R.choice(pool); a.update(user=e["user"], host=e["laptop"], src=e["ip"])
    for k, v in ov.items():
        if k == "actor": continue
        if k in ("ctx", "details"):
            v = v() if callable(v) else v
            a[k].update({kk: (vv() if callable(vv) else vv) for kk, vv in v.items()})
        else:
            a[k] = v() if callable(v) else v

def build(name, var, day, i, j):
    sp = SPEC[name]; base = sp["benign"](day, i); a = copy.deepcopy(base); fp = False
    if var == "benign":
        fp = R.random() < sp.get("fp", 0)
        note = sp["fp_note"] if fp else base["note"]
        verdict = "FalsePositive" if fp else "BenignPositive"
        outcome = "Closed - false positive (detector misfire)" if fp else "Closed - benign (recurring pattern)"
        label, sev, kind = "recurring_benign", R.choices(["Low", "Medium"], [6, 4])[0], "recurring"
    elif var == "lookalike":
        lk = sp["looks"][j % len(sp["looks"])]; apply(a, lk["ov"]); tp = R.random() < lk["tp"]
        note = lk["nt"] if tp else lk["nb"]; verdict = "TruePositive" if tp else "BenignPositive"
        outcome = "Escalated to incident response" if tp else "Closed - benign after human confirmation"
        label, sev, kind = "lookalike", R.choices(["Low", "Medium", "High"], [2, 5, 3])[0], lk["kind"]
    else:
        at = sp["attack"]; apply(a, at["ov"]); note = at["note"]; verdict = "TruePositive"
        outcome = "Incident opened - containment actions taken"
        label, sev, kind = "attack", at.get("sev") or R.choices(["Medium", "High", "Critical"], [4, 4, 2])[0], "real_attack"
    minute = a.get("minute", R.randint(0, 59))
    ts = dt.datetime.combine(START + dt.timedelta(days=day - 1), dt.time(a["hour"], minute))
    flat = {**a["details"], **a["ctx"], "user": a["user"], "host": a["host"], "src": a["src"], "dst": a["dst"],
            "hour": f"{a['hour']:02d}:{minute:02d}", "n": R.randint(1000, 9999)}
    diffs = [k for k in a["ctx"] if a["ctx"][k] != base["ctx"].get(k)] if var != "benign" else []
    return dict(ts=ts, name=name, label=label, kind=kind, sev=sev, verdict=verdict, outcome=outcome, a=a,
                note=note.format_map(D(flat)), diffs=diffs, day=day)

def analyst_for(ts, scen):
    w = (ts.date() - START).days // 7
    order = ANALYSTS[w % 6:] + ANALYSTS[:w % 6]; h = ts.hour
    on = order[4:6] if (h >= 22 or h < 6) else (order[0:2] if h < 14 else order[2:4])
    fav = [x for x in on if scen in x["favored"]]
    return R.choice(fav) if fav and R.random() < 0.7 else R.choice(on)

def main():
    ev = []
    for name in SPEC:
        for d in range(1, N_DAYS + 1):
            w = (START + dt.timedelta(days=d - 1)).weekday()
            for i in range(SCHED[name](d, w)): ev.append((d, name, "benign", i, 0))
        nl = LOOK_N.get(name, 6)
        days = R.sample(range(3, HIST + 1), 2) + R.sample(range(HIST + 1, N_DAYS + 1), nl - 2)
        for j, d in enumerate(days): ev.append((d, name, "lookalike", R.randint(0, 1), j))
        if name in ATT_HIST: ev.append((R.randint(8, HIST), name, "attack", R.randint(0, 1), 0))
        ev.append((26 if name == "big_transfer" else R.randint(HIST + 1, N_DAYS), name, "attack", R.randint(0, 1), 0))
    recs = sorted((build(e[1], e[2], e[0], e[3], e[4]) for e in ev), key=lambda r: r["ts"])
    alerts, gt = [], []
    for n, r in enumerate(recs, 1):
        a, aid = r["a"], f"ALRT-{n:05d}"; an = analyst_for(r["ts"], r["name"]); hist = r["day"] <= HIST
        al = dict(alert_id=aid, timestamp=r["ts"].isoformat(), day=r["day"], phase="history" if hist else "replay",
                  title=SPEC[r["name"]]["title"], category=SPEC[r["name"]]["category"], mitre_technique=SPEC[r["name"]]["mitre"],
                  severity=r["sev"], detector_id=SPEC[r["name"]]["det"], user=a["user"], host=a["host"], src_ip=a["src"],
                  dst=a["dst"], details=a["details"], context=a["ctx"])
        if hist: al.update(analyst=f'{an["id"]} {an["name"]}', investigation_note=r["note"], verdict=r["verdict"], outcome=r["outcome"])
        else: al["status"] = "open"
        alerts.append(al)
        g = dict(alert_id=aid, day=r["day"], phase=al["phase"], scenario=r["name"], variant=r["label"], kind=r["kind"],
                 verdict=r["verdict"], should_escalate=r["label"] != "recurring_benign",
                 memory_reuse_safe=r["label"] == "recurring_benign", context_differences=r["diffs"],
                 analyst=f'{an["id"]} {an["name"]}', analyst_note_if_resolved=r["note"], outcome_if_resolved=r["outcome"])
        if r["name"] == "big_transfer" and r["label"] == "attack": g["story"] = "KILLER: 2 AM ~500 GB transfer that looks like the nightly backup"
        gt.append(g)
    json.dump(alerts, open(f"{OUT}/alerts.json", "w"), indent=1)
    json.dump(gt, open(f"{OUT}/ground_truth.json", "w"), indent=1)
    json.dump(dict(company="Kestrel Logistics (fictional)", period=f"{START} to {START+dt.timedelta(days=N_DAYS-1)}",
                   history_days="1-20", replay_days="21-30", employees=EMP, servers=SRV,
                   analysts=ANALYSTS, shifts="Weekly rota: day 06-14, evening 14-22, night 22-06, 2 analysts each",
                   scheduled_jobs=[dict(id="BK-NIGHTLY-01", desc="db-prod-01 -> backup-srv-02 nightly 02:00, ~420-530 GB"),
                                   dict(id="BK-NIGHTLY-02", desc="file-srv-01 -> backup-srv-01 nightly 03:00, ~180-260 GB"),
                                   dict(id="VS-WEEKLY-01", desc="scan-srv-01 weekly vulnerability scan, Sunday 01:00-03:00"),
                                   dict(id="PATCH-TUE", desc="IT patch window, Tuesday night")],
                   travel_calendar=TRIPS), open(f"{OUT}/company.json", "w"), indent=1)
    c = collections.Counter(g["variant"] for g in gt); v = collections.Counter(g["verdict"] for g in gt)
    p = collections.Counter(g["phase"] for g in gt); k = [g for g in gt if g.get("story")][0]; ka = [x for x in alerts if x["alert_id"] == k["alert_id"]][0]
    md = ["# Synthetic SOC dataset: Kestrel Logistics (fictional)\n",
          f"Total alerts: **{len(alerts)}** | history (days 1-20): {p['history']} | replay (days 21-30): {p['replay']}\n",
          f"Variants: {dict(c)}\nVerdicts: {dict(v)}\n",
          f"\n**Killer story:** {k['alert_id']} at {ka['timestamp']} - {ka['details']['bytes_gb']} GB from {ka['host']} to {ka['dst']}. Same host/window/size as the nightly backup, but external destination, no scheduled job, unfamiliar initiator, sensitive data.\n",
          "\n## Files\n- `alerts.json`: what the agent sees. History alerts include analyst, note, verdict, outcome. Replay alerts are open.\n- `ground_truth.json`: evaluation only (variant, should_escalate, context_differences, the analyst note to use when simulating a resolution).\n- `company.json`: employees, servers, analysts, jobs, travel calendar.\n",
          "\n## Variants\n- `recurring_benign`: harmless repeat, context fully matches history (memory reuse is safe).\n- `lookalike`: looks like a known harmless pattern but 1+ context signals differ (should escalate; a human then confirms benign or real).\n- `attack`: real attack (3+ context signals differ).\n",
          "\n## Scenarios\n| Scenario | Harmless version | Look-alike kinds | Real attack |\n|---|---|---|---|\n"]
    for name, sp in SPEC.items():
        md.append(f"| {name} | {sp['benign'](1,0)['note'].split('.')[0][:70]}... | {', '.join(l['kind'] for l in sp['looks'])} | {sp['attack']['note'].split('.')[0][:80]}... |\n")
    open(f"{OUT}/scenarios.md", "w").write("".join(md))
    print(len(alerts), "alerts", dict(c), dict(v), dict(p)); print("killer:", k["alert_id"], ka["timestamp"], ka["severity"])

if __name__ == "__main__":
    main()
