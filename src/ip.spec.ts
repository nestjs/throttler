import { describe, expect, it } from 'vitest';
import { DEFAULT_IPV6_SUBNET_PREFIX, normalizeIp } from './ip.js';

describe('normalizeIp', () => {
  it('leaves IPv4 addresses untouched', () => {
    expect(normalizeIp('203.0.113.7')).toBe('203.0.113.7');
  });

  it('collapses IPv4-mapped IPv6 onto the IPv4 form', () => {
    expect(normalizeIp('::ffff:203.0.113.7')).toBe('203.0.113.7');
    expect(normalizeIp('::ffff:cb00:7107')).toBe('203.0.113.7');
  });

  it('masks IPv6 to the default /64', () => {
    expect(normalizeIp('2001:db8:0:1:dead:beef:1:2')).toBe(`2001:db8:0:1::/64`);
  });

  it('maps every address in a /64 onto one bucket', () => {
    const rotated = [
      '2001:db8:0:1::1',
      '2001:db8:0:1::2',
      '2001:db8:0:1:ffff:ffff:ffff:ffff',
      '2001:0db8:0000:0001:aaaa:bbbb:cccc:dddd',
    ].map((ip) => normalizeIp(ip));
    expect(new Set(rotated).size).toBe(1);
  });

  it('leaves the IPv6 loopback alone, however it is spelled', () => {
    expect(normalizeIp('::1')).toBe('::1');
    expect(normalizeIp('0:0:0:0:0:0:0:1')).toBe('::1');
    expect(normalizeIp('::0001')).toBe('::1');
  });

  it('keeps distinct subnets distinct', () => {
    expect(normalizeIp('2001:db8:0:1::1')).not.toBe(normalizeIp('2001:db8:0:2::1'));
  });

  it('honours a custom prefix length', () => {
    expect(normalizeIp('2001:db8:0:1::1', 48)).toBe('2001:db8::/48');
    expect(normalizeIp('2001:db8:0:1::1', 128)).toBe('2001:db8:0:1::1/128');
  });

  it('clamps out-of-range prefixes', () => {
    expect(normalizeIp('2001:db8::1', -5)).toBe('::/0');
    expect(normalizeIp('2001:db8::1', 999)).toBe('2001:db8::1/128');
  });

  it('falls back to the default prefix when given a non-finite one', () => {
    const expected = normalizeIp('2001:db8:0:1:dead:beef:1:2');
    expect(normalizeIp('2001:db8:0:1:dead:beef:1:2', NaN)).toBe(expected);
    expect(normalizeIp('2001:db8:0:1:dead:beef:1:2', Infinity)).toBe(expected);
    expect(normalizeIp('2001:db8:0:1:dead:beef:1:2', Number(undefined))).toBe(expected);
  });

  it('strips the zone index so it cannot widen the keyspace', () => {
    expect(normalizeIp('fe80::1%eth0')).toBe(normalizeIp('fe80::2%eth1'));
  });

  it('passes through values that are not IP addresses', () => {
    expect(normalizeIp('user-42')).toBe('user-42');
    expect(normalizeIp('')).toBe('');
    expect(normalizeIp(undefined as unknown as string)).toBeUndefined();
  });

  it('defaults to a /64', () => {
    expect(DEFAULT_IPV6_SUBNET_PREFIX).toBe(64);
  });
});
