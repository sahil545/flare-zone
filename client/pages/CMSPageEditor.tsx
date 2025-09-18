import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cms } from "@/lib/cms";
import type { WpPage } from "../../shared/wp";

export default function CMSPageEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<Partial<WpPage>>({
    title: { raw: "" },
    slug: "",
    status: "draft",
    content: { raw: "" },
    excerpt: { raw: "" },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isNew && id) {
        try {
          setLoading(true);
          const p = await cms.getPage(id);
          if (!cancelled) setModel(p);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const title = model.title?.raw ?? model.title?.rendered ?? "";
  const content = model.content?.raw ?? model.content?.rendered ?? "";
  const excerpt = model.excerpt?.raw ?? model.excerpt?.rendered ?? "";

  const canSave = useMemo(() => (title || "").trim().length > 0, [title]);

  const save = async (publish = false) => {
    try {
      setLoading(true);
      const payload = {
        title: title,
        slug: model.slug || undefined,
        status: publish ? "publish" : model.status || "draft",
        content: content,
        excerpt: excerpt,
      };
      const saved = isNew
        ? await cms.createPage(payload)
        : await cms.updatePage(id!, payload);
      navigate(`/cms/pages/${saved.id}`);
    } catch (e) {
      alert((e as any)?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-4">
        <h1 className="text-xl font-semibold">
          {isNew ? "New Page" : `Edit Page #${id}`}
        </h1>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) =>
              setModel((m) => ({
                ...m,
                title: { ...(m.title || {}), raw: e.target.value },
              }))
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={model.slug || ""}
              onChange={(e) =>
                setModel((m) => ({ ...m, slug: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={(model.status || "draft") as string}
              onValueChange={(v) => setModel((m) => ({ ...m, status: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="publish">Publish</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="excerpt">Excerpt</Label>
          <Textarea
            id="excerpt"
            rows={3}
            value={excerpt}
            onChange={(e) =>
              setModel((m) => ({
                ...m,
                excerpt: { ...(m.excerpt || {}), raw: e.target.value },
              }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Content (HTML)</Label>
          <Textarea
            id="content"
            rows={16}
            value={content}
            onChange={(e) =>
              setModel((m) => ({
                ...m,
                content: { ...(m.content || {}), raw: e.target.value },
              }))
            }
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={() => save(false)} disabled={loading || !canSave}>
            Save Draft
          </Button>
          <Button
            onClick={() => save(true)}
            disabled={loading || !canSave}
            variant="secondary"
          >
            Save & Publish
          </Button>
          <a href="/cms/pages">
            <Button variant="ghost">Back</Button>
          </a>
        </div>
      </div>
    </DashboardLayout>
  );
}
