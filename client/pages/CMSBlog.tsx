import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { cms } from "@/lib/cms";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";

export default function CMSBlog() {
  const [search, setSearch] = useState("");
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["posts", search],
    queryFn: () => cms.listPosts({ search, per_page: 100 }),
  });

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Blog Posts</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && refetch()}
            className="w-64"
          />
          <Button onClick={() => refetch()} disabled={isFetching}>
            Search
          </Button>
          <a href="/cms/blog/new">
            <Button variant="secondary">New Post</Button>
          </a>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data || []).map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.title?.rendered || p.title?.raw || `#${p.id}`}
                </TableCell>
                <TableCell>{p.slug}</TableCell>
                <TableCell className="capitalize">{p.status}</TableCell>
                <TableCell>
                  {new Date(p.modified || p.date).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <a href={`/cms/blog/${p.id}`}>
                      <Button size="sm">Edit</Button>
                    </a>
                    {p.link && (
                      <a href={p.link} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </a>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
