import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AWS SDK
vi.mock("@aws-sdk/client-s3", () => {
  const mockSend = vi.fn();
  return {
    S3Client: vi.fn().mockImplementation(() => ({
      send: mockSend,
      middlewareStack: { add: vi.fn() }
    })),
    ListBucketsCommand: vi.fn(),
    ListObjectsV2Command: vi.fn(),
    GetObjectCommand: vi.fn(),
    PutObjectCommand: vi.fn(),
    DeleteObjectCommand: vi.fn(),
    DeleteObjectsCommand: vi.fn(),
    CopyObjectCommand: vi.fn(),
    HeadObjectCommand: vi.fn(),
    _mockSend: mockSend,
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://example.com/presigned"),
}));

import { S3Client } from "@aws-sdk/client-s3";
import { StorageAdapter } from "./adapter";

describe("StorageAdapter", () => {
  let adapter: StorageAdapter;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const client = new S3Client({} as any);
    mockSend = (client as any).send;
    adapter = new StorageAdapter(client as any);
  });

  it("listBuckets returns bucket names", async () => {
    mockSend.mockResolvedValueOnce({
      Buckets: [{ Name: "bucket-a" }, { Name: "bucket-b" }],
    });
    const result = await adapter.listBuckets();
    expect(result).toEqual(["bucket-a", "bucket-b"]);
  });

  it("listObjects returns objects and prefixes", async () => {
    mockSend.mockResolvedValueOnce({
      Contents: [{ Key: "file.txt", Size: 100, LastModified: new Date("2024-01-01") }],
      CommonPrefixes: [{ Prefix: "folder/" }],
    });
    const result = await adapter.listObjects("bucket", "");
    expect(result.objects).toHaveLength(1);
    expect(result.objects[0].key).toBe("file.txt");
    expect(result.prefixes).toEqual(["folder/"]);
  });

  it("deleteObjects calls DeleteObjectsCommand", async () => {
    mockSend.mockResolvedValueOnce({});
    await adapter.deleteObjects("bucket", ["a.txt", "b.txt"]);
    expect(mockSend).toHaveBeenCalled();
  });

  it("getPresignedUrl returns signed URL", async () => {
    const url = await adapter.getPresignedUrl("bucket", "file.txt");
    expect(url).toBe("https://example.com/presigned");
  });

  it("getPresignedPutUrl returns signed URL", async () => {
    const url = await adapter.getPresignedPutUrl("bucket", "upload.txt", { contentType: "text/plain" });
    expect(url).toBe("https://example.com/presigned");
  });
});
