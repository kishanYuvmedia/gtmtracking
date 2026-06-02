import { Card } from '../../components/ui/Card';

const pages = [
  { url: '/products', views: 1234, percentage: 34 },
  { url: '/', views: 892, percentage: 25 },
  { url: '/checkout', views: 567, percentage: 16 },
  { url: '/about', views: 345, percentage: 10 },
  { url: '/contact', views: 234, percentage: 7 },
];

export function TopPages() {
  const maxViews = pages[0].views;

  return (
    <Card title="Top Pages">
      <div className="space-y-3">
        {pages.map((page) => (
          <div key={page.url}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{page.url}</span>
              <span className="text-gray-500">{page.views.toLocaleString()} views</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full"
                style={{ width: `${(page.views / maxViews) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
