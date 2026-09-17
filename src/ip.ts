import { isIP } from 'net';

/**
 * The default IPv6 prefix length used to group source addresses into a single
 * tracker bucket.
 *
 * A /64 is the smallest block that is guaranteed to be assigned to a single
 * end site, so grouping at /64 never merges two unrelated subscribers, while
 * still collapsing the 2^64 addresses a single subscriber can rotate through.
 *
 * Deployments facing determined abuse may want to widen this to 56 or 48,
 * since many ISPs hand out a /56 or /48 per customer.
 */
export const DEFAULT_IPV6_SUBNET_PREFIX = 64;

/**
 * Expand an IPv6 address into its eight 16-bit groups.
 * Returns `null` when the address cannot be parsed.
 */
function toHextets(address: string): number[] | null {
  let head = address;

  // Rewrite a trailing dotted-quad (e.g. `::ffff:127.0.0.1`) into two hextets.
  const lastColon = head.lastIndexOf(':');
  const tail = head.slice(lastColon + 1);
  if (tail.includes('.')) {
    const octets = tail.split('.').map(Number);
    if (octets.length !== 4 || octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) {
      return null;
    }
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    head = `${head.slice(0, lastColon + 1)}${high}:${low}`;
  }

  const sides = head.split('::');
  if (sides.length > 2) {
    return null;
  }
  const left = sides[0] ? sides[0].split(':') : [];
  const right = sides.length === 2 && sides[1] ? sides[1].split(':') : [];

  const fill = sides.length === 2 ? 8 - left.length - right.length : 0;
  if (fill < 0 || left.length + fill + right.length !== 8) {
    return null;
  }

  const groups = [...left, ...new Array<string>(fill).fill('0'), ...right];
  const hextets = groups.map((group) => parseInt(group, 16));
  if (hextets.some((hextet) => !Number.isInteger(hextet) || hextet < 0 || hextet > 0xffff)) {
    return null;
  }
  return hextets;
}

/**
 * Zero out every bit past `prefix`.
 */
function maskHextets(hextets: number[], prefix: number): number[] {
  return hextets.map((hextet, index) => {
    const bitsBefore = index * 16;
    if (prefix >= bitsBefore + 16) {
      return hextet;
    }
    if (prefix <= bitsBefore) {
      return 0;
    }
    const keep = prefix - bitsBefore;
    return hextet & ((0xffff << (16 - keep)) & 0xffff);
  });
}

/**
 * Render eight hextets as a compressed IPv6 literal (RFC 5952).
 */
function formatIpv6(hextets: number[]): string {
  let bestStart = -1;
  let bestLength = 0;
  let runStart = -1;
  let runLength = 0;

  for (let index = 0; index < hextets.length; index++) {
    if (hextets[index] !== 0) {
      runStart = -1;
      runLength = 0;
      continue;
    }
    if (runStart === -1) {
      runStart = index;
    }
    runLength++;
    if (runLength > bestLength) {
      bestStart = runStart;
      bestLength = runLength;
    }
  }

  const groups = hextets.map((hextet) => hextet.toString(16));
  if (bestLength < 2) {
    return groups.join(':');
  }
  return `${groups.slice(0, bestStart).join(':')}::${groups.slice(bestStart + bestLength).join(':')}`;
}

/**
 * Normalize a source address so that every address a single client can rotate
 * through maps onto one tracker string.
 *
 * - IPv4 addresses are returned unchanged.
 * - IPv4-mapped IPv6 addresses (`::ffff:1.2.3.4`) collapse onto the IPv4 form,
 *   so the same host is tracked identically on a dual-stack listener.
 * - The IPv6 loopback (`::1`) is left alone; it is a single address with no
 *   subnet to rotate through.
 * - Other IPv6 addresses are masked to `ipv6SubnetPrefix` bits and rendered as
 *   a CIDR block (`2001:db8:0:1::/64`).
 * - Anything that is not an IP address is returned unchanged, so custom
 *   trackers (user ids, API keys) are never rewritten.
 */
export function normalizeIp(
  ip: string,
  ipv6SubnetPrefix: number = DEFAULT_IPV6_SUBNET_PREFIX,
): string {
  if (typeof ip !== 'string' || ip.length === 0) {
    return ip;
  }

  // A zone index (`fe80::1%eth0`) is host-local and must not widen the keyspace.
  const zoneIndex = ip.indexOf('%');
  const bare = zoneIndex === -1 ? ip : ip.slice(0, zoneIndex);

  const version = isIP(bare);
  if (version === 4) {
    return bare;
  }
  if (version !== 6) {
    return ip;
  }

  const hextets = toHextets(bare.toLowerCase());
  if (!hextets) {
    return ip;
  }

  // The loopback is one address, not a subnet worth masking. Test the parsed
  // form so `0:0:0:0:0:0:0:1` and `::0001` land in the same place as `::1`.
  const isLoopback = hextets[7] === 1 && hextets.slice(0, 7).every((hextet) => hextet === 0);
  if (isLoopback) {
    return '::1';
  }

  // `::ffff:a.b.c.d` is a single IPv4 host, not a subnet.
  const isIpv4Mapped =
    hextets[0] === 0 &&
    hextets[1] === 0 &&
    hextets[2] === 0 &&
    hextets[3] === 0 &&
    hextets[4] === 0 &&
    hextets[5] === 0xffff;
  if (isIpv4Mapped) {
    return [hextets[6] >> 8, hextets[6] & 0xff, hextets[7] >> 8, hextets[7] & 0xff].join('.');
  }

  // A non-finite prefix (`Number(undefined)` from an unset env var, say) must
  // fall back to the default rather than silently leaving every bit in place.
  const prefix = Number.isFinite(ipv6SubnetPrefix)
    ? Math.min(Math.max(Math.trunc(ipv6SubnetPrefix), 0), 128)
    : DEFAULT_IPV6_SUBNET_PREFIX;
  return `${formatIpv6(maskHextets(hextets, prefix))}/${prefix}`;
}
