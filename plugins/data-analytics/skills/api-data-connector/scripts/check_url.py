#!/usr/bin/env python3
"""Check that an outbound URL is safe to fetch (SSRF guard for user-supplied endpoints).

Examples:
    python check_url.py https://api.example.com/v1/items
    python check_url.py http://169.254.169.254/latest/meta-data/          # rejected: link-local / cloud metadata
    python check_url.py http://localhost./admin http://[::ffff:10.0.0.5]/ # one JSON object per line
    python check_url.py --no-resolve http://10.0.0.5/                      # literal-only check, no DNS
    python check_url.py --allow-host minio.internal http://minio.internal:9000/   # explicit exception
    python check_url.py --allow-scheme ftp ftp://files.example.com/x.csv

Output: one JSON object per URL, keys sorted: {"addresses": [...], "host": "...", "ok": true|false, "reason": "..."}.
Exit codes: 0 = every URL is allowed, 1 = at least one URL is rejected (including DNS failures),
2 = usage error.

What is rejected:
- schemes outside the allowlist (default http, https), credentials in the URL, backslashes or whitespace;
- localhost, *.localhost, localhost.localdomain (trailing dots are normalized away);
- any resolved or literal address that is unspecified, loopback, private, link-local (incl. 169.254.169.254),
  shared/CGNAT 100.64.0.0/10, multicast, reserved, site-local or otherwise not globally routable;
- IPv6 forms that embed one of those IPv4 addresses: IPv4-mapped (::ffff:a.b.c.d), IPv4-compatible (::a.b.c.d),
  6to4 (2002::/16) and NAT64 (64:ff9b::/96, 64:ff9b:1::/48);
- obfuscated IPv4 literals (2130706433, 0x7f.1, 0177.0.0.1) are decoded before the check.

DNS rebinding: a hostname can resolve to a public address now and to 127.0.0.1 a second later. A check like this
is only sound if the caller then connects to one of the validated addresses (pin the IP, send the original Host
header / SNI), or re-runs the check on every request with redirects disabled. Never follow redirects without
checking each hop.
"""
import argparse
import ipaddress
import json
import re
import socket
import sys
from urllib.parse import urlsplit

DEFAULT_SCHEMES = ("http", "https")
DEFAULT_PORTS = {"http": 80, "https": 443}
LOCAL_NAMES = {"localhost", "localhost.localdomain", "ip6-localhost", "ip6-loopback"}
CGNAT = ipaddress.ip_network("100.64.0.0/10")
SIX_TO_FOUR = ipaddress.ip_network("2002::/16")
NAT64 = (ipaddress.ip_network("64:ff9b::/96"), ipaddress.ip_network("64:ff9b:1::/48"))
METADATA_IPS = {ipaddress.ip_address("169.254.169.254"), ipaddress.ip_address("fd00:ec2::254")}
_LEGACY_V4 = re.compile(r"^(0x[0-9a-f]+|[0-9]+)(\.(0x[0-9a-f]+|[0-9]+)){0,3}$", re.IGNORECASE)


def _embedded_ipv4(ip):
    """Return the IPv4 address embedded in an IPv6 address, or None."""
    if ip.version != 6:
        return None
    if ip.ipv4_mapped:
        return ip.ipv4_mapped
    if ip in SIX_TO_FOUR:
        return ip.sixtofour
    packed = int(ip)
    if any(ip in net for net in NAT64):
        return ipaddress.IPv4Address(packed & 0xFFFFFFFF)
    # IPv4-compatible (deprecated): ::a.b.c.d, excluding :: and ::1
    if packed >> 32 == 0 and packed > 1:
        return ipaddress.IPv4Address(packed & 0xFFFFFFFF)
    return None


def blocked_reason(ip):
    """Return why an address must not be contacted, or None if it is globally routable."""
    inner = _embedded_ipv4(ip)
    if inner is not None:
        reason = blocked_reason(inner)
        return f"embeds {inner}: {reason}" if reason else None
    if ip.is_unspecified:
        return "unspecified address"
    if ip.is_loopback:
        return "loopback address"
    if ip in METADATA_IPS:
        return "cloud metadata endpoint"
    if ip.is_link_local:
        return "link-local address"
    if ip.version == 4 and ip in CGNAT:
        return "shared address space (CGNAT 100.64.0.0/10)"
    if ip.is_multicast:
        return "multicast address"
    if ip.is_reserved:
        return "reserved address"
    if ip.is_private:
        return "private address"
    if ip.version == 6 and ip.is_site_local:
        return "site-local address"
    if not ip.is_global:
        return "not globally routable"
    return None


def _literal_ip(host):
    """Parse host as an IP literal, including legacy IPv4 spellings; None if it is a name."""
    try:
        return ipaddress.ip_address(host)
    except ValueError:
        pass
    if _LEGACY_V4.match(host):
        try:
            return ipaddress.IPv4Address(socket.inet_aton(host))
        except OSError:
            return None
    return None


def _host_allowed(host, allow_hosts):
    for pattern in allow_hosts:
        pattern = pattern.lower().rstrip(".")
        if pattern.startswith("*.") and (host == pattern[2:] or host.endswith(pattern[1:])):
            return True
        if host == pattern:
            return True
    return False


def check_url(url, allow_schemes=DEFAULT_SCHEMES, allow_hosts=(), resolve=True):
    """Return {"ok", "reason", "host", "addresses"} for one URL."""
    result = {"ok": False, "reason": "", "host": "", "addresses": []}
    if any(ch.isspace() for ch in url) or "\\" in url:
        result["reason"] = "URL contains whitespace or backslashes"
        return result
    try:
        parts = urlsplit(url)
        port = parts.port
    except ValueError as exc:
        result["reason"] = f"unparseable URL: {exc}"
        return result
    scheme = parts.scheme.lower()
    if scheme not in {s.lower() for s in allow_schemes}:
        result["reason"] = f"scheme '{scheme or '(none)'}' is not allowed"
        return result
    if parts.username is not None or parts.password is not None:
        result["reason"] = "credentials in the URL are not allowed (send them in headers)"
        return result
    host = (parts.hostname or "").rstrip(".").lower()
    result["host"] = host
    if not host:
        result["reason"] = "URL has no host"
        return result
    if _host_allowed(host, allow_hosts):
        result.update(ok=True, reason="host explicitly allowed")
        return result
    if host in LOCAL_NAMES or host.endswith(".localhost"):
        result["reason"] = "local hostname"
        return result

    literal = _literal_ip(host)
    if literal is not None:
        addresses = [literal]
    elif not resolve:
        result.update(ok=True, reason="hostname not resolved (--no-resolve)")
        return result
    else:
        try:
            infos = socket.getaddrinfo(host, port or DEFAULT_PORTS.get(scheme, 0), proto=socket.IPPROTO_TCP)
        except (socket.gaierror, UnicodeError, OSError) as exc:
            result["reason"] = f"could not resolve host: {exc}"
            return result
        addresses = sorted({ipaddress.ip_address(info[4][0].split("%")[0]) for info in infos},
                           key=lambda a: (a.version, int(a)))
        if not addresses:
            result["reason"] = "host resolved to no addresses"
            return result

    result["addresses"] = [str(a) for a in addresses]
    for addr in addresses:
        reason = blocked_reason(addr)
        if reason:
            result["reason"] = f"{addr} is blocked: {reason}"
            return result
    result.update(ok=True, reason="all addresses are globally routable")
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description="SSRF check for outbound URLs (see module docstring).")
    parser.add_argument("urls", nargs="+", help="one or more URLs to check")
    parser.add_argument("--allow-scheme", action="append", default=[], metavar="SCHEME",
                        help="extra scheme to allow (default: http, https); repeatable")
    parser.add_argument("--allow-host", action="append", default=[], metavar="HOST",
                        help="host exempt from the checks, exact or '*.example.com'; repeatable")
    parser.add_argument("--no-resolve", action="store_true",
                        help="do not resolve hostnames; only literal IPs and local names are checked")
    args = parser.parse_args(argv)

    schemes = tuple(DEFAULT_SCHEMES) + tuple(args.allow_scheme)
    all_ok = True
    for url in args.urls:
        res = check_url(url, schemes, args.allow_host, resolve=not args.no_resolve)
        all_ok = all_ok and res["ok"]
        print(json.dumps(res, sort_keys=True))
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
