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
const BASE_PREFIX = process.env.S3_BASE_PREFIX!;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const limit = Number(searchParams.get("limit") || 20);
    const cursor = searchParams.get("cursor") || undefined;
    const deviceId = searchParams.get("deviceId") || "";
    const date = searchParams.get("date") || ""; // YYYY-MM-DD

    /**
     * ✅ S3-level filtering by deviceId
     */
    const prefix = deviceId
      ? `${BASE_PREFIX}${deviceId}_`
      : BASE_PREFIX;

    let collected: {
      device_id: string;
      timestamp: number;
      key: string;
    }[] = [];

    let continuationToken: string | undefined = cursor;
    let hasMore = true;

    /**
     * 🔁 Fetch until enough records AFTER filtering
     */
    while (collected.length < limit && hasMore) {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        MaxKeys: 200, // fetch more, filter later
        ContinuationToken: continuationToken,
      });

      const res = await s3.send(command);
      continuationToken = res.NextContinuationToken;
      hasMore = Boolean(res.IsTruncated);

      const batch =
        res.Contents?.map((obj) => {
          if (!obj.Key) return null;

          const fileName = obj.Key.split("/").pop();
          if (!fileName) return null;

          const [device_id, tsPart] = fileName.split("_");
          const timestamp = Number(tsPart?.replace(".jpg", ""));

          if (!device_id || !timestamp) return null;

          return { device_id, timestamp, key: obj.Key };
        }).filter(Boolean) as {
          device_id: string;
          timestamp: number;
          key: string;
        }[];

      /**
       * ✅ Date filtering using timestamp
       */
      const filtered = date
        ? batch.filter((item) => {
            const d = new Date(item.timestamp * 1000);
            const itemDate =
              d.getFullYear() +
              "-" +
              String(d.getMonth() + 1).padStart(2, "0") +
              "-" +
              String(d.getDate()).padStart(2, "0");
            return itemDate === date;
          })
        : batch;

      collected.push(...filtered);
    }

    /**
     * ✅ CRITICAL: SORT AFTER COLLECTING
     * Latest images ALWAYS first
     */
    collected.sort((a, b) => b.timestamp - a.timestamp);

    /**
     * ✅ Apply page limit
     */
    const pageData = collected.slice(0, limit);

    /**
     * ✅ Generate signed URLs
     */
    const data = await Promise.all(
      pageData.map(async (item) => {
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
      nextCursor: continuationToken ?? null,
      hasMore,
    });
  } catch (error) {
    console.error("S3 fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}
