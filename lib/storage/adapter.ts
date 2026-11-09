import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  type CORSRule,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "stream";

export type StorageObject = {
  key: string;
  size: number;
  lastModified: Date;
  isFolder: boolean;
};

export type ListObjectsResult = {
  objects: StorageObject[];
  prefixes: string[];
  nextContinuationToken?: string;
};

/** 统一封装 S3 兼容服务的对象操作、预签名和桶 CORS 控制面。 */
export class StorageAdapter {
  constructor(private client: S3Client) {}

  async listBuckets(): Promise<string[]> {
    const res = await this.client.send(new ListBucketsCommand({}));
    return (res.Buckets ?? []).map((b) => b.Name!).filter(Boolean);
  }

  async listObjects(bucket: string, prefix = "", delimiter = "/", continuationToken?: string): Promise<ListObjectsResult> {
    const res = await this.client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        Delimiter: delimiter,
        MaxKeys: 1000,
        ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
      })
    );
    const objects: StorageObject[] = (res.Contents ?? []).map((o) => ({
      key: o.Key!,
      size: o.Size ?? 0,
      lastModified: o.LastModified ?? new Date(),
      isFolder: false,
    }));
    const prefixes = (res.CommonPrefixes ?? []).map((p) => p.Prefix!).filter(Boolean);
    return { objects, prefixes, nextContinuationToken: res.NextContinuationToken };
  }

  async getObject(bucket: string, key: string): Promise<Readable> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return res.Body as Readable;
  }

  async putObject(
    bucket: string,
    key: string,
    body: Readable | Buffer | ReadableStream,
    contentLength?: number
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: body as PutObjectCommandInput["Body"], ContentLength: contentLength })
    );
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  async deleteObjects(bucket: string, keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: keys.map((k) => ({ Key: k })) },
      })
    );
  }

  async copyObject(srcBucket: string, srcKey: string, dstBucket: string, dstKey: string): Promise<void> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: dstBucket,
        Key: dstKey,
        CopySource: encodeURIComponent(`${srcBucket}/${srcKey}`),
      })
    );
  }

  async headObject(bucket: string, key: string) {
    return this.client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  }

  async getPresignedUrl(bucket: string, key: string, expiresIn = 3600, forceDownload = false): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ...(forceDownload && {
        ResponseContentDisposition: `attachment; filename="${encodeURIComponent(key.split("/").pop() || "download")}"`,
      }),
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /** 为 bucket/key 签名 PUT；显式 contentType 纳入签名，返回 URL 不绑定未知文件 checksum。 */
  async getPresignedPutUrl(
    bucket: string,
    key: string,
    options?: { expiresIn?: number; contentType?: string }
  ): Promise<string> {
    const expiresIn = options?.expiresIn ?? 900;
    const contentType = options?.contentType;
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ...(contentType ? { ContentType: contentType } : {}),
      }),
      { expiresIn, ...(contentType ? { signableHeaders: new Set(["content-type"]) } : {}) }
    );
  }

  /** 读取 bucket 的全部 CORS 规则；仅明确无配置时返回空数组。 */
  async getBucketCors(bucket: string): Promise<CORSRule[]> {
    try {
      const result = await this.client.send(new GetBucketCorsCommand({ Bucket: bucket }));
      return result.CORSRules ?? [];
    } catch (error) {
      if (error instanceof Error && error.name === "NoSuchCORSConfiguration") return [];
      throw error;
    }
  }

  /** 用完整 rules 写入 bucket CORS；调用方负责先读后合并，错误向上传递。 */
  async putBucketCors(bucket: string, rules: CORSRule[]): Promise<void> {
    await this.client.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: rules } }));
  }

  // ---- Multipart Upload Methods ----

  async createMultipartUpload(bucket: string, key: string, contentType?: string): Promise<string> {
    const res = await this.client.send(
      new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        ...(contentType ? { ContentType: contentType } : {}),
      })
    );
    if (!res.UploadId) throw new Error("Failed to create multipart upload");
    return res.UploadId;
  }

  async getPresignedUploadPartUrl(
    bucket: string,
    key: string,
    uploadId: string,
    partNumber: number,
    expiresIn = 3600
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new UploadPartCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
      }),
      { expiresIn }
    );
  }

  async completeMultipartUpload(
    bucket: string,
    key: string,
    uploadId: string,
    parts: { PartNumber: number; ETag: string }[]
  ): Promise<void> {
    await this.client.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
        },
      })
    );
  }

  async abortMultipartUpload(bucket: string, key: string, uploadId: string): Promise<void> {
    await this.client.send(
      new AbortMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
      })
    );
  }

  async listParts(
    bucket: string,
    key: string,
    uploadId: string
  ): Promise<{ partNumber: number; etag: string; size: number }[]> {
    const allParts: { partNumber: number; etag: string; size: number }[] = [];
    let partNumberMarker: string | undefined;

    do {
      const res = await this.client.send(
        new ListPartsCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          ...(partNumberMarker ? { PartNumberMarker: partNumberMarker } : {}),
        })
      );
      for (const part of res.Parts ?? []) {
        if (part.PartNumber && part.ETag && part.Size !== undefined) {
          allParts.push({
            partNumber: part.PartNumber,
            etag: part.ETag,
            size: part.Size,
          });
        }
      }
      partNumberMarker = res.IsTruncated ? res.NextPartNumberMarker : undefined;
    } while (partNumberMarker);

    return allParts;
  }
}
