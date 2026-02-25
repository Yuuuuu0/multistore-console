import { prisma } from "@/lib/db";
import { createS3Client } from "./client";
import { StorageAdapter } from "./adapter";

export async function getStorageAdapter(providerId: string): Promise<StorageAdapter> {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw new Error(`Provider ${providerId} not found`);
  const client = createS3Client({
    accessKeyId: provider.accessKeyId,
    secretAccessKey: provider.secretAccessKey,
    endpoint: provider.endpoint,
    region: provider.region,
    forcePathStyle: provider.forcePathStyle,
    disableChunked: provider.disableChunked,
  });
  return new StorageAdapter(client);
}
