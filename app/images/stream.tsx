"use client";

import { Filter, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import { DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {FilterChip} from './filterchip';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";


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
  const [total, setTotal] = useState<number>(0);
  const[time,setTime]=useState("");
  const [deviceIdInput, setDeviceIdInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [activeFilters, setActiveFilters] = useState<{ deviceId?: string; date?: string }>({});



  const [deviceId, setDeviceId] = useState("");
  const [date, setDate] = useState("");


   useEffect(() => {
    setTime(
        new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        })
    );
}, []);

  const fetchImages = async (page: number) => {
    setLoading(true);

    const cursor = cursorStack[page - 1];

    const params = new URLSearchParams({
    limit: String(limit),
    });

    if (cursor) params.append("cursor", cursor);
    if (deviceId) params.append("deviceId", deviceId);
    if (date) params.append("date", date);
    console.log("fetchImages called", page);

    const res = await fetch(`/api/data?${params.toString()}`);
    const result = await res.json();
    console.log(result)
    setTotal(result.total);

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

  const refreshImages = async () => {
  setLoading(true);
    setTime(
        new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        })
    );
  const params = new URLSearchParams({
    limit: String(limit),
  });

  const res = await fetch(`/api/data?${params.toString()}`);
  const result = await res.json();
  setTotal(result.total)
  console.log(result)

  const sorted = [...result.data].sort(
    (a: StreamItem, b: StreamItem) => b.timestamp - a.timestamp
  );

  setData(sorted);
  setHasMore(result.hasMore);

  // reset pagination properly
  setCursorStack([null, result.nextCursor]);
  setCurrentPage(1);

  setLoading(false);
};


//format timestamp
function formatDateLocal(timestampSeconds: number) {
  const dateObj = new Date(timestampSeconds * 1000);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0"); // months 0-11
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`; // "2025-12-15"
}


//filtered data
const filteredData = data.filter((item) => {
  const deviceMatch =
    deviceId === "" ||
    item.device_id.toLowerCase().includes(deviceId.toLowerCase());
    // console.log(deviceMatch)
  
    // console.log(date)
  const dateMatch =
     date === "" || formatDateLocal(item.timestamp) === date;

  return deviceMatch && dateMatch;
});

const getVisiblePages = () => {
  const total = cursorStack.length
  const pages: (number | "ellipsis")[] = []

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  pages.push(1)

  if (currentPage > 3) {
    pages.push("ellipsis")
  }

  const start = Math.max(2, currentPage - 1)
  const end = Math.min(total - 1, currentPage + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (currentPage < total - 2) {
    pages.push("ellipsis")
  }

  pages.push(total)

  return pages
}




  return (
    <div className="w-full">
      {/* Header */}
      
      <div className="rounded-lg border border-border px-4 py-4 mb-8">
      <div className="flex justify-between items-center mb-3 ">
       <div className="flex items-center gap-6 mb-3">
        <h1 className="text-2xl font-semibold">Live Stream</h1>
            <p className="text-xs text-muted-foreground rounded-xl border border-border px-2 py-2">Last Updated: {time}</p>
        </div>

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

          <Button onClick={refreshImages} disabled={loading}>
            <RefreshCw size={16} /> Refresh
          </Button>

        </div>
      </div>

      {/* 🔢 Number Pagination (TOP) */}
      <div className=" flex justify-between">
    <Pagination className="mb-4 flex justify-start">
  <PaginationContent>

    {/* Previous */}
    <PaginationItem>
      <PaginationPrevious
        onClick={() => currentPage > 1 && fetchImages(currentPage - 1)}
        className={
          currentPage === 1
            ? "pointer-events-none opacity-50"
            : "cursor-pointer"
        }
      />
    </PaginationItem>

    {/* Page Numbers */}
    {getVisiblePages().map((page, index) =>
      page === "ellipsis" ? (
        <PaginationItem key={`e-${index}`}>
          <PaginationEllipsis />
        </PaginationItem>
      ) : (
        <PaginationItem key={page}>
          <PaginationLink
            isActive={currentPage === page}
            onClick={() => fetchImages(page)}
          >
            {page}
          </PaginationLink>
        </PaginationItem>
      )
    )}

    {/* Next */}
    <PaginationItem>
      <PaginationNext
        onClick={() =>
          currentPage < cursorStack.length &&
          fetchImages(currentPage + 1)
        }
        className={
          currentPage === cursorStack.length
            ? "pointer-events-none opacity-50"
            : "cursor-pointer"
        }
      />
    </PaginationItem>

  </PaginationContent>
</Pagination>


  {/* Filter Controls (RIGHT END) */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="px-3 py-2 w-36 text-sm text-foreground bg-card border border-border rounded-lg hover:border-primary flex items-center gap-2">
        <Filter className="w-4 h-4" />
        Filter Events
      </button>
    </DropdownMenuTrigger>

    <DropdownMenuContent className="w-[400px] p-4" align="end">
      {/* Device ID */}
      <p className="text-muted-foreground text-sm mb-1">Device ID</p>
      <input
        type="text"
        placeholder="Enter Device ID"
        className="w-full px-2 py-1 mb-3 text-sm border border-border rounded-md bg-muted"
        onChange={(e) => {
        const deviceIdVal = e.target.value;
        setDeviceIdInput(deviceIdVal);
        setActiveFilters(prev => ({ ...prev, deviceId: deviceIdVal }));
        }}
      />

      {/* Date */}
      <p className="text-muted-foreground text-sm mt-3 mb-1">Date</p>
      <input
        type="date"
        className="w-full px-2 py-1 mb-3 text-sm border border-border rounded-md bg-muted"
        onChange={(e) => {
            const dateVal = e.target.value;
            setDateInput(dateVal);
            setActiveFilters(prev => ({ ...prev, date: dateVal }));
            }}
      />

      {/* Footer Buttons */}
      <div className="flex justify-end mt-4 gap-2">
       <button
        className="px-4 py-2 bg-muted rounded-lg"
        onClick={() => {
            setDeviceId("");
            setDate("");
            setDeviceIdInput("");
            setDateInput("");
            setActiveFilters({});

            setCursorStack([null]);
            setCurrentPage(1);

            fetchImages(1); // 🔥 show all data again
        }}
        >
        Clear
        </button>

        <button
        className="px-4 py-2 bg-primary text-white rounded-lg"
        onClick={() => {
            setDeviceId(deviceIdInput);
            setDate(dateInput);

            // 🔥 RESET PAGINATION
            setCursorStack([null]);
            setCurrentPage(1);

            // 🔥 FETCH FILTERED DATA
            fetchImages(1);
        }}
        >
        Apply Filters
        </button>

      </div>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
</div>
     <div className="flex gap-2 flex-wrap">
    {Object.entries(activeFilters).map(([key, value]) =>
        value ? (
        <FilterChip
            key={key}
            label={`${key === 'deviceId' ? 'Device' : 'Date'}: ${value}`}
            onRemove={() => {
            setActiveFilters(prev => {
                const copy = { ...prev };
                delete copy[key];
                return copy;
            });

            if (key === "deviceId") setDeviceId("");
            if (key === "date") setDate("");

            setCursorStack([null]);
            setCurrentPage(1);
            fetchImages(1); // 🔥 reload data
            }}

        />
        ) : null
    )}
    </div>
  {/* </div> */}
 


      {/* Table */}
     <div className="border rounded-lg max-h-[800px] overflow-y-auto">
        <table className="w-full">
            <thead className="sticky top-0 bg-primary z-10 text-white">
            <tr>
                <th className="px-4 py-2 text-left">Device</th>
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">Image</th>
            </tr>
            </thead>

          <tbody>
            {filteredData.map((row) => (
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
          <img src={preview ?? "image"} className="rounded" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Stream;