"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type StreamItem = {
  device_id: string;
  timestamp: number;
  s3_image_url: string;
};

function Stream() {
  const [data, setData] = useState<StreamItem[]>([]);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const fetchImages = async (page: number) => {
    setLoading(true);

    const cursor = cursorStack[page - 1];

    const params = new URLSearchParams({
      limit: String(limit),
    });

    if (cursor) params.append("cursor", cursor);

    const res = await fetch(`/api/data?${params.toString()}`);
    const result = await res.json();

    // 🔽 SORT BY DATE (LATEST FIRST)
    const sorted = [...result.data].sort(
      (a: StreamItem, b: StreamItem) => b.timestamp - a.timestamp
    );

    setData(sorted);
    setHasMore(result.hasMore);

    // Save cursor for next page
    if (!cursorStack[page]) {
      setCursorStack((prev) => [...prev, result.nextCursor]);
    }

    setCurrentPage(page);
    setLoading(false);
  };

  // Initial load & limit change
  useEffect(() => {
    setCursorStack([null]);
    setCurrentPage(1);
    fetchImages(1);
  }, [limit]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-2xl font-semibold">Live Stream</h1>

        <div className="flex gap-2">
          <Select
            value={String(limit)}
            onValueChange={(v) => setLimit(Number(v))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="20">20 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
              <SelectItem value="100">100 / page</SelectItem>
            </SelectContent>
          </Select>

          <button
            onClick={() => {
              setCursorStack([null]);
              setCurrentPage(1);
              fetchImages(1);
            }}
            className="px-3 py-2 border rounded flex gap-2"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* 🔢 Number Pagination (TOP) */}
      <div className="flex gap-2 mb-3">
        {cursorStack.map((_, index) => {
          const page = index + 1;
          return (
            <button
              key={page}
              onClick={() => fetchImages(page)}
              disabled={loading}
              className={`px-3 py-1 border rounded
                ${currentPage === page ? "bg-black text-white" : ""}
              `}
            >
              {page}
            </button>
          );
        })}

        {hasMore && (
          <button
            onClick={() => fetchImages(cursorStack.length + 1)}
            className="px-3 py-1 border rounded"
          >
            +
          </button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left">Device</th>
              <th className="px-4 py-2 text-left">Time</th>
              <th className="px-4 py-2 text-left">Image</th>
            </tr>
          </thead>

          <tbody>
            {data.map((row) => (
              <tr key={row.timestamp} className="border-t hover:bg-muted">
                <td className="px-4 py-2">{row.device_id}</td>
                <td className="px-4 py-2 font-mono">
                  {new Date(row.timestamp * 1000)
                    .toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })
                    .replace(",", "")}
                </td>
                <td className="px-4 py-2">
                  <img
                    src={row.s3_image_url}
                    className="w-14 h-14 rounded cursor-pointer"
                    onClick={() => setPreview(row.s3_image_url)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Image Preview */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent>
          <img src={preview ?? ""} className="rounded" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Stream;
