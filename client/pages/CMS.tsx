import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CMS() {
  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>CMS Pages</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p>Manage website pages (title, URL slug, content, status).</p>
            <div className="space-x-2">
              <a href="/cms/pages">
                <Button variant="default">View Pages</Button>
              </a>
              <a href="/cms/pages/new">
                <Button variant="secondary">New Page</Button>
              </a>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Blog</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p>Manage blog posts and publish updates.</p>
            <div className="space-x-2">
              <a href="/cms/blog">
                <Button variant="default">View Posts</Button>
              </a>
              <a href="/cms/blog/new">
                <Button variant="secondary">New Post</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
