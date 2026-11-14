import { NextRequest, NextResponse } from 'next/server';
import { lookup } from 'node:dns/promises';
import net from 'node:net';
import { getUserFromRequest } from '@/lib/auth';
import connectDB from '@/lib/db';
import Image from '@/models/Image';
import { hasValidImageMagicBytes } from '@/lib/utils';
import { enforceRateLimits, getClientIp } from '@/lib/rate-limit';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const BLOCKED_IP_RANGES = (() => {
  const blockList = new net.BlockList();
  // IPv4 reserved / private / loopback / metadata ranges
  blockList.addSubnet('0.0.0.0', 8, 'ipv4');
  blockList.addSubnet('10.0.0.0', 8, 'ipv4');
  blockList.addSubnet('100.64.0.0', 10, 'ipv4');
  blockList.addSubnet('127.0.0.0', 8, 'ipv4');
  blockList.addSubnet('169.254.0.0', 16, 'ipv4');
  blockList.addSubnet('172.16.0.0', 12, 'ipv4');
  blockList.addSubnet('192.0.0.0', 24, 'ipv4');
  blockList.addSubnet('192.0.2.0', 24, 'ipv4');
  blockList.addSubnet('192.168.0.0', 16, 'ipv4');
  blockList.addSubnet('198.18.0.0', 15, 'ipv4');
  blockList.addSubnet('198.51.100.0', 24, 'ipv4');
  blockList.addSubnet('203.0.113.0', 24, 'ipv4');
  blockList.addSubnet('224.0.0.0', 4, 'ipv4');
  blockList.addSubnet('240.0.0.0', 4, 'ipv4');
  // IPv6 unspecified / loopback / IPv4-compatible (::/96) / ULA / link-local / multicast / tunneling / NAT64
  // Note: Omit ::ffff:0:0/96 from the shared BlockList because Node.js matches plain IPv4 addresses
  // against ::ffff:0:0/96; private IPv4-mapped IPv6 addresses (dotted and hex) still match the IPv4 rules above.
  blockList.addSubnet('::', 96, 'ipv6');
  blockList.addSubnet('64:ff9b::', 96, 'ipv6');
  blockList.addSubnet('64:ff9b:1::', 48, 'ipv6');
  blockList.addSubnet('100::', 64, 'ipv6');
  blockList.addSubnet('2001::', 32, 'ipv6');
  blockList.addSubnet('2001:db8::', 32, 'ipv6');
  blockList.addSubnet('2002::', 16, 'ipv6');
  blockList.addSubnet('fc00::', 7, 'ipv6');
  blockList.addSubnet('fe80::', 10, 'ipv6');
  blockList.addSubnet('ff00::', 8, 'ipv6');
  return blockList;
})();

function normalizeIpLiteral(ip: string): string {
  const unbracketed = ip.trim().replace(/^\[|\]$/g, '').toLowerCase();
  const zoneIndex = unbracketed.indexOf('%');
  return zoneIndex === -1 ? unbracketed : unbracketed.slice(0, zoneIndex);
}

function isPrivateIpAddress(ip: string): boolean {
  const normalized = normalizeIpLiteral(ip);
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice(7);
    if (net.isIP(mapped) === 4 && BLOCKED_IP_RANGES.check(mapped, 'ipv4')) {
      return true;
    }
  }
  const ipVersion = net.isIP(normalized);
  if (ipVersion === 4) {
    return BLOCKED_IP_RANGES.check(normalized, 'ipv4');
  }
  if (ipVersion === 6) {
    return BLOCKED_IP_RANGES.check(normalized, 'ipv6');
  }
  return true;
}

async function assertSafeExternalUrl(url: URL): Promise<void> {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only HTTP and HTTPS image URLs are allowed');
  }
  const hostname = normalizeIpLiteral(url.hostname);
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('Private or local network hostnames are not allowed');
  }
  if (net.isIP(hostname)) {
    if (isPrivateIpAddress(hostname)) {
      throw new Error('Private or loopback IP addresses are not allowed');
    }
    return;
  }
  const resolved = await lookup(hostname, { all: true });
  if (!resolved.length || resolved.some((entry) => isPrivateIpAddress(entry.address))) {
    throw new Error('Resolved image host points to a disallowed IP range');
  }
}

export async function POST(request: NextRequest) {
  try {
    const userPayload = await getUserFromRequest(request);

    if (!userPayload) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const clientIp = getClientIp(request);
    const limited = await enforceRateLimits([
      { key: `upload-external-image:user:${userPayload.id}`, limit: 20, windowSeconds: 10 * 60 },
      { key: `upload-external-image:ip:${clientIp}`, limit: 40, windowSeconds: 10 * 60 },
    ]);
    if (limited) return limited;

    await connectDB();

    const body = (await request.json().catch(() => null)) as {
      imageUrl?: unknown;
      folder?: unknown;
    } | null;
    const imageUrl = typeof body?.imageUrl === 'string' ? body.imageUrl.trim() : '';
    const safeFolder =
      typeof body?.folder === 'string' && /^[a-z0-9-_]+$/i.test(body.folder)
        ? body.folder
        : 'email-images';

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image URL provided' }, { status: 400 });
    }

    let url: URL;
    try {
      url = new URL(imageUrl);
      await assertSafeExternalUrl(url);
    } catch (validationError: unknown) {
      const msg =
        validationError instanceof Error ? validationError.message : 'Invalid image URL';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    try {
      const response = await fetch(url.toString(), {
        redirect: 'manual',
        signal: AbortSignal.timeout(10000),
      });

      if (response.status >= 300 && response.status < 400) {
        return NextResponse.json(
          { error: 'Image URL redirects are not allowed for security reasons' },
          { status: 400 }
        );
      }

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Unable to fetch image from the provided external URL' },
          { status: 502 }
        );
      }

      const rawContentType = response.headers.get('content-type') || '';
      const contentType = rawContentType.split(';')[0].trim().toLowerCase();

      if (!ALLOWED_MIME_TYPES.has(contentType)) {
        return NextResponse.json(
          { error: 'URL does not point to a supported image format (JPEG, PNG, GIF, WebP)' },
          { status: 400 }
        );
      }

      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader) {
        const declaredSize = Number(contentLengthHeader);
        if (Number.isFinite(declaredSize) && declaredSize > MAX_IMAGE_BYTES) {
          return NextResponse.json(
            { error: 'Image size exceeds 5MB limit' },
            { status: 400 }
          );
        }
      }

      if (!response.body) {
        return NextResponse.json(
          { error: 'Image response body was empty' },
          { status: 400 }
        );
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > MAX_IMAGE_BYTES) {
            await reader.cancel().catch(() => undefined);
            return NextResponse.json(
              { error: 'Image size exceeds 5MB limit' },
              { status: 400 }
            );
          }
          chunks.push(value);
        }
      }

      const buffer = Buffer.concat(chunks, totalBytes);
      if (buffer.length === 0 || !hasValidImageMagicBytes(buffer, contentType)) {
        return NextResponse.json(
          { error: 'Fetched file is empty or does not match an allowed image signature' },
          { status: 400 }
        );
      }
      const filename = url.pathname.split('/').pop() || `external-${Date.now()}.jpg`;

      const newImage = new Image({
        name: filename,
        userId: userPayload.id,
        data: buffer,
        contentType,
        folder: safeFolder,
        size: buffer.length,
      });

      await newImage.save();

      return NextResponse.json({
        success: true,
        imageUrl: `/api/images/${newImage._id}`,
        imageId: newImage._id.toString(),
      });
    } catch (fetchError: unknown) {
      console.error('Error fetching external image:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch external image' },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('Error processing external image URL:', error);
    return NextResponse.json(
      { error: 'Failed to process external image' },
      { status: 500 }
    );
  }
}