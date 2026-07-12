import type { MetadataRoute } from "next";
export default function robots():MetadataRoute.Robots { return {rules:{userAgent:"*",allow:"/"},sitemap:"https://nikita-babkin.dev/sitemap.xml"}; }
