/** 浏览器不暴露跨域网络失败的确切原因；提示检查网络、TLS、endpoint 和 CORS。 */
export const DIRECT_UPLOAD_NETWORK_ERROR = "直传失败：检查网络、HTTPS 和存储桶 CORS（允许本站 PUT/Content-Type）；在直传设置查看规则。该错误不一定是 CORS。";

/** 提取控制面 JSON 错误，保留服务端具体原因。 */
export async function readUploadApiError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => null);
  return data?.error || `${fallback}（HTTP ${response.status}）`;
}

/** 从对象存储 XML 错误中提取 Code/Message，不把预签名 URL 暴露给用户。 */
export function storageUploadError(status: number, body: string): string {
  const code = body.match(/<Code>([^<]*)<\/Code>/)?.[1];
  const message = body.match(/<Message>([^<]*)<\/Message>/)?.[1];
  return `对象存储直传失败（HTTP ${status}${code ? `，${code}` : ""}）${message ? `：${message}` : ""}。请检查上传权限、签名有效期、endpoint/地址方式和 Content-Type；若浏览器屏蔽响应，也需检查 CORS。`;
}
