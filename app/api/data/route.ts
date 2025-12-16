import { NextResponse } from "next/server";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME!;
const PREFIX = process.env.S3_BASE_PREFIX!;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const limit = Number(searchParams.get("limit") || 10);
    const cursor = searchParams.get("cursor") || undefined;

    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: PREFIX,
      MaxKeys: limit,
      ContinuationToken: cursor,
    });

    const res = await s3.send(command);

    const records = (res.Contents || [])
      .map((obj) => {
        if (!obj.Key) return null;

        const fileName = obj.Key.split("/").pop();
        if (!fileName) return null;

        const [device_id, tsPart] = fileName.split("_");
        const timestamp = Number(tsPart?.replace(".jpg", ""));

        if (!device_id || !timestamp) return null;

        return {
          device_id,
          timestamp,
          key: obj.Key,
        };
      })
      .filter(Boolean) as {
        device_id: string;
        timestamp: number;
        key: string;
      }[];

    // sort latest first (IMPORTANT)
    records.sort((a, b) => b.timestamp - a.timestamp);

    const data = await Promise.all(
      records.map(async (item) => {
        const signedUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: BUCKET,
            Key: item.key,
          }),
          { expiresIn: 600 }
        );

        return {
          device_id: item.device_id,
          timestamp: item.timestamp,
          s3_image_url: signedUrl,
        };
      })
    );

    return NextResponse.json({
      data,
      nextCursor: res.IsTruncated
        ? res.NextContinuationToken
        : null,
      hasMore: res.IsTruncated,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
