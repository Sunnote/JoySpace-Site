import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { format } from "date-fns";
import { remark } from "remark";
import html from "remark-html";
import remarkGfm from "remark-gfm";

const contentDirectory = path.join(process.cwd(), "..", "content");


async function markdownToHtml(markdown) {
  const result = await remark()
    .use(remarkGfm)
    .use(html, {
      sanitize: false,
    })
    .process(markdown);
  return result.toString();
}

export async function getAllPosts() {
  try {
    const postsDirectory = path.join(contentDirectory, "posts");

    if (!fs.existsSync(postsDirectory)) {
      console.warn("Posts directory not found:", postsDirectory);
      return [];
    }

    const filenames = fs.readdirSync(postsDirectory);

    const posts = filenames
      .filter((filename) => filename.endsWith(".md"))
      .map((filename) => {
        const filePath = path.join(postsDirectory, filename);
        const fileContents = fs.readFileSync(filePath, "utf8");
        const { data, content } = matter(fileContents);

        const date = data.date
          ? format(new Date(data.date), "MMMM d, yyyy")
          : "Unknown date";

        return {
          slug: filename.replace(".md", ""),
          title: data.title || filename.replace(".md", ""),
          date: date,
          excerpt: data.excerpt || "",
          image:
            data.image ||
            "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1920&auto=format&fit=crop",
          content,
        };
      });

    return posts.sort((a, b) => {
      if (!a.date || a.date === "Unknown date") return 1;
      if (!b.date || b.date === "Unknown date") return -1;
      return new Date(b.date) - new Date(a.date);
    });
  } catch (error) {
    console.error("Error getting posts:", error);
    return [];
  }
}

export async function getPostBySlug(slug) {
  try {
    const filePath = path.join(contentDirectory, "posts", `${slug}.md`);
    const fileContents = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(fileContents);

    const date = data.date
      ? format(new Date(data.date), "MMMM d, yyyy")
      : "Unknown date";

    // Remove title block from content
    const lines = content.split('\n')
    const titleStartIndex = lines.findIndex(line => line.trim().startsWith('#'))
    
    // Process content to remove title
    let processedContent = content
    if (titleStartIndex >= 0) {
      // Find the first empty line after the title
      const titleEndIndex = lines.findIndex((line, index) => 
        index > titleStartIndex && line.trim() === ''
      )
      
      // If no empty line found, just remove the first line
      const contentLines = titleEndIndex > titleStartIndex
        ? [...lines.slice(0, titleStartIndex), ...lines.slice(titleEndIndex)]
        : [...lines.slice(0, titleStartIndex), ...lines.slice(titleStartIndex + 1)]
      
      processedContent = contentLines.join('\n').trim()
    }

    // Convert markdown to HTML
    const contentHtml = await markdownToHtml(processedContent);

    return {
      content: contentHtml,
      metadata: {
        title: data.title || slug,
        date: date,
        excerpt: data.excerpt || "",
        image:
          data.image ||
          "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1920&auto=format&fit=crop",
        author: data.author || "Anonymous",
        tags: data.tags || [],
      },
    };
  } catch (error) {
    console.error("Error getting post:", error);
    throw new Error(`Post not found: ${slug}`);
  }
}

export async function getPageContent(filename) {
  try {
    const filePath = path.join(contentDirectory, "pages", filename);
    const fileContents = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(fileContents);

    // Remove title from content by removing first line if it starts with #
    const lines = content.split('\n')
    const contentWithoutTitle = lines[0].startsWith('#') 
      ? lines.slice(1).join('\n').trim()
      : content.trim()

    // Convert markdown to HTML
    const contentHtml = await markdownToHtml(contentWithoutTitle);

    return {
      content: contentHtml,
      metadata: {
        title: data.title || "",
        description: data.description || "",
        lastUpdated: data.lastUpdated || "",
      },
    };
  } catch (error) {
    console.error("Error getting page:", error);
    throw new Error(`Page not found: ${filename}`);
  }
}
